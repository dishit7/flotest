import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { EMAIL_CATEGORIES, type EmailCategory } from '@/lib/email-categories'
import { prisma } from '@/lib/prisma'

interface GmailLabel {
  id: string
  name: string
}

interface GmailMessage {
  id: string
  threadId: string
}

interface GmailMessageDetail {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  payload: {
    headers: Array<{ name: string; value: string }>
  }
}

export async function POST(request: Request) {
  try {
    let providerToken: string | undefined
    let userId: string | undefined
    
    const supabase = await createClient()
    
    try {
      const body = await request.json()
      providerToken = body.providerToken
      userId = body.userId
    } catch {
    }

    if (!userId || !providerToken) {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }
      
      if (!userId) userId = session.user.id
      if (!providerToken) providerToken = session.provider_token || undefined
    }
    
    if (!providerToken) {
      return NextResponse.json({ error: 'No Google access token found' }, { status: 400 })
    }

    const labelMap = new Map<EmailCategory, string>()
    const labelsToStore: Record<string, { id: string; name: string; color: string; enabled: boolean; isCustom: boolean }> = {}
    
    const listLabelsResponse = await fetch(
      'https://www.googleapis.com/gmail/v1/users/me/labels',
      {
        headers: { 'Authorization': `Bearer ${providerToken}` }
      }
    )
    
    let existingLabels: GmailLabel[] = []
    if (listLabelsResponse.ok) {
      const labelsData = await listLabelsResponse.json()
      existingLabels = labelsData.labels || []
    }
    
    for (const [key, category] of Object.entries(EMAIL_CATEGORIES)) {
      try {
        const existingLabel = existingLabels.find(
          (l: GmailLabel) => l.name === category.label
        )
        
        if (existingLabel) {
          labelMap.set(key as EmailCategory, existingLabel.id)
          
          labelsToStore[key] = {
            id: existingLabel.id,
            name: category.label,
            color: category.color,
            enabled: true,
            isCustom: false
          }
        } else {
          const createLabelResponse = await fetch(
            'https://www.googleapis.com/gmail/v1/users/me/labels',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${providerToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                name: category.label,
                labelListVisibility: 'labelShow',
                messageListVisibility: 'show',
                color: category.gmailColor
              })
            }
          )

          if (createLabelResponse.ok) {
            const labelData: GmailLabel = await createLabelResponse.json()
            labelMap.set(key as EmailCategory, labelData.id)
            
            labelsToStore[key] = {
              id: labelData.id,
              name: category.label,
              color: category.color,
              enabled: true,
              isCustom: false
            }
          } else {
            const errorData = await createLabelResponse.json()
            console.error(`Failed to create label ${category.label}:`, errorData)
          }
        }
      } catch (error) {
        console.error(`Error processing label ${category.label}:`, error)
      }
    }
    
    if (userId && Object.keys(labelsToStore).length > 0) {
      try {
        await prisma.profile.upsert({
          where: { id: userId },
          create: {
            id: userId,
            email: '',
          },
          update: {}
        })

        await prisma.userSettings.upsert({
          where: { userId },
          create: {
            userId,
            labels: labelsToStore
          },
          update: {
            labels: labelsToStore
          }
        })
        
        console.log(`Saved ${Object.keys(labelsToStore).length} labels to database`)
      } catch (dbError) {
        console.error('Error saving labels to database:', dbError)
      }
    }

    const messagesResponse = await fetch(
      'https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=100',
      {
        headers: { 'Authorization': `Bearer ${providerToken}` }
      }
    )

    if (!messagesResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    const messagesData: { messages?: GmailMessage[] } = await messagesResponse.json()

    if (!messagesData.messages || messagesData.messages.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Labels created, but no emails to process' 
      })
    }

    const emailDetails = await Promise.all(
      messagesData.messages.map(async (message) => {
        const detailResponse = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata`,
          {
            headers: { 'Authorization': `Bearer ${providerToken}` }
          }
        )

        if (!detailResponse.ok) return null

        const detail: GmailMessageDetail = await detailResponse.json()
        const headers = detail.payload.headers
        const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || 'Unknown'
        const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '(No Subject)'

        return {
          id: detail.id,
          from,
          subject,
          snippet: detail.snippet
        }
      })
    )

    const validEmails = emailDetails.filter(email => email !== null)

    if (validEmails.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Labels created, but no valid emails to categorize' 
      })
    }

    const emailsText = validEmails.map((email, idx) => 
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
      categories = validEmails.reduce((acc, email) => {
        acc[email.id] = 'FYI'
        return acc
      }, {} as Record<string, EmailCategory>)
    }

    const labelingResults = await Promise.all(
      Object.entries(categories).map(async ([emailId, category]) => {
        const labelId = labelMap.get(category)
        
        if (!labelId) {
          console.warn(`No label ID found for category: ${category}`)
          return { emailId, success: false }
        }

        try {
          const modifyResponse = await fetch(
            `https://www.googleapis.com/gmail/v1/users/me/messages/${emailId}/modify`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${providerToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                addLabelIds: [labelId]
              })
            }
          )

          return { 
            emailId, 
            success: modifyResponse.ok,
            category 
          }
        } catch (error) {
          console.error(`Error labeling email ${emailId}:`, error)
          return { emailId, success: false }
        }
      })
    )

    const successCount = labelingResults.filter(r => r.success).length

    return NextResponse.json({ 
      success: true,
      labelsCreated: labelMap.size,
      emailsProcessed: validEmails.length,
      emailsLabeled: successCount,
      results: labelingResults
    })

  } catch (error) {
    console.error('Error in auto-label process:', error)
    return NextResponse.json(
      { 
        error: 'Failed to auto-label emails',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

