import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { EMAIL_CATEGORIES, type EmailCategory } from '@/lib/email-categories'

interface CategorizeRequest {
  emails: Array<{
    id: string
    from: string
    subject: string
    snippet: string
    body?: {
      text: string
      html: string
    }
  }>
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body: CategorizeRequest = await request.json()
    const { emails } = body

    if (!emails || emails.length === 0) {
      return NextResponse.json({ categories: {} })
    }
    const emailsText = emails.map((email, idx) => 
      `Email ${idx + 1}:
ID: ${email.id}
From: ${email.from}
Subject: ${email.subject}
Preview: ${email.snippet}
---`
    ).join('\n\n')

    const categoryDescriptions = Object.entries(EMAIL_CATEGORIES)
      .map(([key, value]) => `${key}: ${value.description}`)
      .join('\n')

    const prompt = `You are an email classification assistant. Categorize each email into ONE of these categories:

${categoryDescriptions}

Analyze these emails and respond ONLY with a JSON object mapping email IDs to categories.

Example response format:
{
  "email-id-1": "TO_RESPOND",
  "email-id-2": "MARKETING",
  "email-id-3": "FYI"
}

Emails to categorize:
${emailsText}

Return ONLY the JSON object, no other text.`

    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      prompt,
      temperature: 0.3,
    })

    let categories: Record<string, EmailCategory> = {}
    
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        categories = JSON.parse(jsonMatch[0])
      } else {
        categories = JSON.parse(text)
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      categories = emails.reduce((acc, email) => {
        acc[email.id] = 'FYI'
        return acc
      }, {} as Record<string, EmailCategory>)
    }

    // Generate draft replies for TO_RESPOND emails
    const drafts: Record<string, string> = {}
    const toRespondEmails = emails.filter(email => categories[email.id] === 'TO_RESPOND')

    console.log(`🤖 Found ${toRespondEmails.length} emails categorized as TO_RESPOND`)

    if (toRespondEmails.length > 0) {
      console.log('📝 Generating AI draft replies...')
      
      // Generate drafts for each TO_RESPOND email
      const draftPromises = toRespondEmails.map(async (email) => {
        try {
          const emailContent = email.body?.text || email.body?.html || email.snippet
          
          console.log(`\n🎯 Generating draft for: ${email.from} - "${email.subject}"`)
          
          const draftPrompt = `You are an email assistant. Generate a professional, concise, and helpful reply to the following email.

From: ${email.from}
Subject: ${email.subject}
Content:
${emailContent}

Write a professional reply that:
1. Addresses the main points or questions
2. Is polite and concise
3. Uses appropriate tone
4. Ends with a proper signature line (just use "Best regards," without a name)

Return ONLY the draft reply text, no other commentary.`

          const { text: draftText } = await generateText({
            model: google('gemini-2.5-flash'),
            prompt: draftPrompt,
            temperature: 0.7,
          })

          const draft = draftText.trim()
          console.log(`✅ Generated draft (${draft.length} chars):`, draft.substring(0, 150) + '...')
          
          return { id: email.id, draft }
        } catch (error) {
          console.error(`❌ Failed to generate draft for email ${email.id}:`, error)
          return { id: email.id, draft: '' }
        }
      })

      const draftResults = await Promise.all(draftPromises)
      draftResults.forEach(({ id, draft }) => {
        if (draft) {
          drafts[id] = draft
        }
      })
      
      console.log(`🎉 Generated ${Object.keys(drafts).length} draft(s) successfully!`)
    }

    return NextResponse.json({ categories, drafts })

  } catch (error) {
    console.error('Error categorizing emails:', error)
    return NextResponse.json(
      { 
        error: 'Failed to categorize emails',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

