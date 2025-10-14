import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { EMAIL_CATEGORIES, type EmailCategory } from '@/lib/email-categories'
import { prisma } from '@/lib/prisma'
import type { DraftSettings } from '@/app/api/user/draft-settings/route'

interface GenerateDraftsRequest {
  category?: string // Optional: default to 'TO_RESPOND'
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const providerToken = session.provider_token
    if (!providerToken) {
      return NextResponse.json({ error: 'No Gmail access token' }, { status: 401 })
    }

    // Fetch user's draft settings
    const profile = await prisma.profile.findUnique({
      where: { id: session.user.id },
      select: { 
        settings: {
          select: { draftSettings: true }
        }
      }
    })

    const defaultSettings: DraftSettings = {
      draftTone: 'professional',
      draftLength: 'medium',
      includeGreeting: true,
      includeClosing: true,
      formalityLevel: 3,
      responseStyle: 'detailed',
      useEmojis: false,
      avoidWords: [],
      preferredPhrases: [],
    }

    const userSettings: DraftSettings = profile?.settings?.draftSettings 
      ? { ...defaultSettings, ...(profile.settings.draftSettings as Partial<DraftSettings>) }
      : defaultSettings

    console.log('📝 User Draft Settings:', JSON.stringify(userSettings, null, 2))

    const body: GenerateDraftsRequest = await request.json().catch(() => ({}))
    const categoryKey = body.category || 'TO_RESPOND'

    // Get the actual label name from EMAIL_CATEGORIES
    const categoryConfig = EMAIL_CATEGORIES[categoryKey as EmailCategory]
    if (!categoryConfig) {
      return NextResponse.json({ 
        error: `Invalid category: ${categoryKey}` 
      }, { status: 400 })
    }

    const labelName = categoryConfig.label
    console.log(`Fetching emails from category: ${categoryKey} (Label: "${labelName}")`)

    // Fetch emails with the specified label
    const labelsResponse = await fetch(
      'https://www.googleapis.com/gmail/v1/users/me/labels',
      {
        headers: {
          'Authorization': `Bearer ${providerToken}`,
        },
      }
    )

    if (!labelsResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch labels' }, { status: 500 })
    }

    const labelsData = await labelsResponse.json() as { labels?: Array<{ id: string; name: string }> }
    const categoryLabel = labelsData.labels?.find(
      (label) => label.name === labelName
    )

    if (!categoryLabel) {
      return NextResponse.json({ 
        error: `Label "${labelName}" not found. Please categorize your emails first using the auto-label feature.` 
      }, { status: 404 })
    }

    console.log(`Found label: ${categoryLabel.name} (ID: ${categoryLabel.id})`)

    // Fetch messages with this label
    const messagesResponse = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?labelIds=${categoryLabel.id}&maxResults=50`,
      {
        headers: {
          'Authorization': `Bearer ${providerToken}`,
        },
      }
    )

    if (!messagesResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    const messagesData = await messagesResponse.json()
    const messages = messagesData.messages || []

    if (messages.length === 0) {
      return NextResponse.json({ 
        message: 'No emails found in this category',
        draftsCreated: 0 
      })
    }

    console.log(`Found ${messages.length} messages in ${categoryKey}`)

    // Fetch full email details for each message
    const emailPromises = messages.map(async (message: { id: string }) => {
      const emailResponse = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
        {
          headers: {
            'Authorization': `Bearer ${providerToken}`,
          },
        }
      )
      return emailResponse.json()
    })

    const emails = await Promise.all(emailPromises)

    // Generate drafts for each email
    const draftPromises = emails.map(async (email: { id: string; threadId?: string; payload?: { headers?: Array<{ name: string; value: string }>; parts?: Array<{ mimeType: string; body?: { data?: string } }>; body?: { data?: string } }; snippet?: string }) => {
      try {
        const headers = email.payload?.headers || []
        const from = headers.find((h) => h.name === 'From')?.value || ''
        const subject = headers.find((h) => h.name === 'Subject')?.value || ''
        const threadId = email.threadId

        // Extract email body
        let emailBody = ''
        if (email.payload?.parts) {
          const textPart = email.payload.parts.find((part) => 
            part.mimeType === 'text/plain' || part.mimeType === 'text/html'
          )
          if (textPart?.body?.data) {
            emailBody = Buffer.from(textPart.body.data, 'base64').toString()
          }
        } else if (email.payload?.body?.data) {
          emailBody = Buffer.from(email.payload.body.data, 'base64').toString()
        }

        if (!emailBody) {
          emailBody = email.snippet || ''
        }

        console.log(`Generating draft for: ${from} - "${subject}"`)

        // Generate AI draft reply using user settings
        const draftPrompt = buildPromptWithSettings(from, subject, emailBody, userSettings)
        
        // Log the final prompt being sent to LLM
        console.log('🤖 ===== FINAL PROMPT TO LLM =====')
        console.log(draftPrompt)
        console.log('🤖 ===== END OF PROMPT =====')

        const { text: draftText } = await generateText({
          model: google('gemini-2.5-flash'),
          prompt: draftPrompt,
          temperature: 0.7,
        })

        const draftBody = draftText.trim()
        console.log(`Generated draft (${draftBody.length} chars)`)

        // Create Gmail draft
        const toEmail = extractEmailAddress(from)
        const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`
        
        const emailLines = [
          `To: ${toEmail}`,
          `Subject: ${replySubject}`,
          'MIME-Version: 1.0',
          'Content-Type: text/plain; charset=utf-8',
          '',
          draftBody
        ]

        const emailContent = emailLines.join('\r\n')
        const encodedEmail = Buffer.from(emailContent)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '')

        const draftPayload: { message: { raw: string; threadId?: string } } = {
          message: { raw: encodedEmail }
        }

        if (threadId) {
          draftPayload.message.threadId = threadId
        }

        const draftResponse = await fetch(
          'https://www.googleapis.com/gmail/v1/users/me/drafts',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${providerToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(draftPayload)
          }
        )

        if (draftResponse.ok) {
          const draft = await draftResponse.json()
          console.log(`Draft created successfully! Draft ID: ${draft.id}`)
          return { 
            success: true, 
            draftId: draft.id, 
            emailId: email.id,
            subject 
          }
        } else {
          const error = await draftResponse.json()
          console.error(`Failed to create draft:`, error)
          return { 
            success: false, 
            emailId: email.id,
            subject,
            error 
          }
        }
      } catch (error) {
        console.error(`Error generating draft:`, error)
        return { 
          success: false, 
          emailId: email.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    const results = await Promise.all(draftPromises)
    const successCount = results.filter(r => r.success).length

    console.log(`Created ${successCount}/${results.length} drafts successfully`)

    return NextResponse.json({
      message: `Generated ${successCount} drafts for ${categoryKey} emails`,
      draftsCreated: successCount,
      totalEmails: results.length,
      results
    })

  } catch (error) {
    console.error('Error generating drafts:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate drafts',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper function to extract email address from "Name <email>" format
function extractEmailAddress(from: string): string {
  const match = from.match(/<(.+?)>/)
  return match ? match[1] : from
}

// Helper function to build prompt based on user settings
function buildPromptWithSettings(
  from: string,
  subject: string,
  emailBody: string,
  settings: DraftSettings
): string {
  // Tone mapping
  const toneDescriptions = {
    professional: 'professional and business-appropriate',
    friendly: 'warm and friendly',
    casual: 'casual and conversational',
    formal: 'formal and respectful',
    direct: 'direct and to-the-point'
  }

  // Length mapping
  const lengthDescriptions = {
    short: '1-2 short paragraphs',
    medium: '2-3 paragraphs',
    long: '3-4 detailed paragraphs'
  }

  // Response style mapping
  const styleDescriptions = {
    direct: 'Get straight to the point without unnecessary pleasantries.',
    empathetic: 'Show understanding and empathy for the sender\'s situation.',
    detailed: 'Provide thorough explanations and comprehensive responses.'
  }

  // Build the base prompt
  let prompt = `You are an email assistant. Generate a ${toneDescriptions[settings.draftTone]} reply to the following email.\n\n`
  
  prompt += `From: ${from}\n`
  prompt += `Subject: ${subject}\n`
  prompt += `Content:\n${emailBody.substring(0, 2000)}\n\n`
  
  prompt += `Write a ${toneDescriptions[settings.draftTone]} reply that:\n`
  prompt += `1. Is approximately ${lengthDescriptions[settings.draftLength]} in length\n`
  prompt += `2. Addresses the main points or questions\n`
  
  // Add greeting instruction
  if (settings.includeGreeting) {
    prompt += `3. Starts with an appropriate greeting\n`
  } else {
    prompt += `3. Skips the greeting and starts directly with the content\n`
  }
  
  // Add closing instruction
  if (settings.includeClosing) {
    if (settings.signatureTemplate) {
      prompt += `4. Ends with the following signature:\n${settings.signatureTemplate}\n`
    } else {
      prompt += `4. Ends with an appropriate closing (e.g., "Best regards,")\n`
    }
  } else {
    prompt += `4. Skips the closing signature\n`
  }

  // Add response style
  if (settings.responseStyle) {
    prompt += `5. Style: ${styleDescriptions[settings.responseStyle]}\n`
  }

  // Add formality level
  if (settings.formalityLevel !== undefined) {
    const formalityDescriptions = [
      '',
      'very casual and relaxed',
      'casual but respectful',
      'neutral and balanced',
      'formal and professional',
      'very formal and ceremonious'
    ]
    prompt += `6. Use a ${formalityDescriptions[settings.formalityLevel]} tone\n`
  }

  // Add emoji instruction
  if (settings.useEmojis) {
    prompt += `7. Feel free to use emojis where appropriate\n`
  } else {
    prompt += `7. Do NOT use any emojis\n`
  }

  // Add custom instructions
  if (settings.customInstructions) {
    prompt += `\nAdditional Instructions:\n${settings.customInstructions}\n`
  }

  // Add words to avoid
  if (settings.avoidWords && settings.avoidWords.length > 0) {
    prompt += `\nAvoid using these words/phrases: ${settings.avoidWords.join(', ')}\n`
  }

  // Add preferred phrases
  if (settings.preferredPhrases && settings.preferredPhrases.length > 0) {
    prompt += `\nTry to use these phrases when appropriate: ${settings.preferredPhrases.join(', ')}\n`
  }

  prompt += `\nReturn ONLY the draft reply text, no other commentary.`

  return prompt
}

