import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { EMAIL_CATEGORIES } from '@/lib/email-categories'
import { getValidGoogleToken } from '@/lib/refresh-google-token'

interface PubSubMessage {
  message: {
    data: string
    messageId: string
    publishTime: string
  }
  subscription: string
}

interface GmailNotification {
  emailAddress: string
  historyId: string
}

export async function POST(request: Request) {
  try {
     const body: PubSubMessage = await request.json()
     const decodedData = Buffer.from(body.message.data, 'base64').toString('utf-8')
    const notification: GmailNotification = JSON.parse(decodedData)
    
     const { emailAddress, historyId: rawHistoryId } = notification
    
     const historyId = String(rawHistoryId)
    
    console.log(`\n[WEBHOOK] Notification for: ${emailAddress} | History: ${historyId}`)

     const profile = await prisma.profile.findFirst({
      where: { email: emailAddress },
      include: { settings: true }
    })

    if (!profile) {
      console.log(`[WEBHOOK] User not found: ${emailAddress}`)
      return NextResponse.json({ success: true }, { status: 200 })
    }

    console.log(`[WEBHOOK] Found user: ${profile.id}`)

    const accessToken = await getValidGoogleToken(profile.id)

    if (!accessToken) {
      console.log(`[WEBHOOK] Failed to get valid access token`)
      return NextResponse.json({ success: true }, { status: 200 })
    }

    console.log(`[WEBHOOK] Access token validated`)

    const userSettings = profile.settings
    const lastHistoryId = profile.gmailHistoryId

    console.log(`[WEBHOOK] DB gmailHistoryId: ${lastHistoryId || '(none)'} (user: ${profile.id})`)

    if (!userSettings?.autoCategorizeEnabled) {
      console.log(`[WEBHOOK] Auto-categorize disabled`)
      return NextResponse.json({ success: true }, { status: 200 })
    }

    if (!lastHistoryId) {
      console.log(`[WEBHOOK] No history ID stored, updating to current: ${historyId}`)
      await prisma.profile.update({
        where: { id: profile.id },
        data: { gmailHistoryId: historyId }
      })
      console.log(`[WEBHOOK] Stored initial gmailHistoryId in DB: ${historyId}`)
      return NextResponse.json({ success: true }, { status: 200 })
    }

    console.log(`[WEBHOOK] Fetching history - From: ${lastHistoryId} To: ${historyId}`)

    // Update historyId IMMEDIATELY to prevent race conditions
    await prisma.profile.update({
      where: { id: profile.id },
      data: { gmailHistoryId: historyId }
    })
    console.log(`[WEBHOOK] Updated historyId immediately to: ${historyId}`)

    const historyResponse = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/history?startHistoryId=${lastHistoryId}&historyTypes=messageAdded`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )

    if (!historyResponse.ok) {
      const errorText = await historyResponse.text()
      console.error(`[WEBHOOK ERROR] History fetch failed`)
      console.error(`[WEBHOOK ERROR] Status: ${historyResponse.status} ${historyResponse.statusText}`)
      console.error(`[WEBHOOK ERROR] Response: ${errorText}`)
      console.error(`[WEBHOOK ERROR] Requested historyId: ${lastHistoryId}`)
      console.error(`[WEBHOOK ERROR] Current historyId: ${historyId}`)
      return NextResponse.json({ success: false }, { status: 200 })
    }

    const historyData = await historyResponse.json()

    if (!historyData.history || historyData.history.length === 0) {
      console.log(`[WEBHOOK] No new messages in history`)
      return NextResponse.json({ success: true }, { status: 200 })
    }

     const newMessageIds: string[] = []
    historyData.history.forEach((item: any) => {
      if (item.messagesAdded) {
        item.messagesAdded.forEach((added: any) => {
          if (added.message.labelIds?.includes('INBOX')) {
            newMessageIds.push(added.message.id)
          }
        })
      }
    })

    console.log(`[WEBHOOK] Found ${newMessageIds.length} new message(s) in INBOX`)

    if (newMessageIds.length === 0) {
      return NextResponse.json({ success: true }, { status: 200 })
    }

    console.log(`[WEBHOOK] Fetching message details...`)
    
    const messages = await Promise.all(
      newMessageIds.map(async (msgId) => {
        try {
          const res = await fetch(
            `https://www.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
          )
          if (!res.ok) return null

          const detail = await res.json()
          const headers = detail.payload.headers
          const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || ''
          const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || ''

            const fromEmail = extractEmailAddress(from)
          if (fromEmail.toLowerCase() === emailAddress.toLowerCase()) {
            console.log(`[WEBHOOK] Skipping self-sent: ${subject}`)
            return null
          }

           let bodyText = ''
          if (detail.payload.body?.data) {
            bodyText = Buffer.from(detail.payload.body.data, 'base64').toString('utf-8')
          } else if (detail.payload.parts) {
            const textPart = detail.payload.parts.find((p: any) => p.mimeType === 'text/plain')
            if (textPart?.body?.data) {
              bodyText = Buffer.from(textPart.body.data, 'base64').toString('utf-8')
            }
          }

          return {
            id: detail.id,
            threadId: detail.threadId,
            from,
            subject,
            snippet: detail.snippet,
            bodyText: bodyText.substring(0, 1000)  
          }
        } catch (err) {
          console.error(`Error fetching message ${msgId}:`, err)
          return null
        }
      })
    )

    const validMessages = messages.filter(m => m !== null)

    if (validMessages.length === 0) {
      console.log(`[WEBHOOK] No valid messages to process`)
      return NextResponse.json({ success: true }, { status: 200 })
    }

    console.log(`[WEBHOOK] Processing ${validMessages.length} message(s)`)

    console.log(`[WEBHOOK] Categorizing emails with AI (user preferences included)...`)

    const emailsText = validMessages.map((email, idx) => 
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

    const userPreferencesText = userSettings ? `
USER PREFERENCES (keep these in mind):
- Draft Settings: ${JSON.stringify(userSettings.draftSettings || {})}
- Label Settings: ${JSON.stringify(userSettings.labels || {})}
- Label Customization: ${JSON.stringify(userSettings.labelCustomization || {})}
` : ''

    const categorizePrompt = `You are an email classification assistant.

${userPreferencesText}

Categorize each email into ONE of these categories:
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

    let categories: Record<string, string> = {}
    
    try {
      const { text } = await generateText({
        model: google('gemini-2.5-flash'),
        prompt: categorizePrompt,
        temperature: 0.3,
      })

      const jsonMatch = text.match(/\{[\s\S]*\}/)
      categories = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text)
    } catch (err) {
      console.error('[WEBHOOK ERROR] AI categorization failed:', err)
      console.log('[WEBHOOK] Falling back to default category (FYI)')
      
      categories = validMessages.reduce((acc, email) => {
        acc[email.id] = 'FYI'
        return acc
      }, {} as Record<string, string>)
    }

    console.log(`[WEBHOOK] Categorized ${Object.keys(categories).length} email(s)`)
    
    // Log each email's category
    validMessages.forEach(email => {
      const category = categories[email.id] || 'UNKNOWN'
      console.log(`  -> Email: "${email.subject}" | From: ${email.from}`)
      console.log(`     Category: ${category}`)
    })

    // 8. Apply labels (if auto-label enabled)
    if (userSettings?.autoLabelEnabled) {
      console.log(`[WEBHOOK] Applying labels...`)
      console.log(`[WEBHOOK] Available labels in settings:`, Object.keys((userSettings.labels as any) || {}))

      const labelsMap = (userSettings.labels as any) || {}
      
      const labelResults = await Promise.all(
        Object.entries(categories).map(async ([emailId, category]) => {
          const labelData = labelsMap[category]
          const labelId = labelData?.id

          if (!labelId) {
            console.error(`[WEBHOOK ERROR] No label ID found for category: ${category}`)
            return { emailId, success: false, reason: 'No label ID' }
          }

          console.log(`[WEBHOOK LABEL] Email ${emailId} -> Category: ${category} -> Label: ${labelId}`)

          try {
            const response = await fetch(
              `https://www.googleapis.com/gmail/v1/users/me/messages/${emailId}/modify`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ addLabelIds: [labelId] })
              }
            )

            if (response.ok) {
              console.log(`[WEBHOOK LABEL] Successfully applied label "${category}" to email ${emailId}`)
              return { emailId, success: true, category, labelId }
            } else {
              const errorText = await response.text()
              console.error(`[WEBHOOK ERROR] Failed to apply label to ${emailId}`)
              console.error(`[WEBHOOK ERROR] Status: ${response.status}`)
              console.error(`[WEBHOOK ERROR] Response: ${errorText}`)
              return { emailId, success: false, error: errorText }
            }
          } catch (err) {
            console.error(`[WEBHOOK ERROR] Error labeling ${emailId}:`, err)
            return { emailId, success: false, error: err }
          }
        })
      )

      const successfulLabels = labelResults.filter(r => r.success).length
      console.log(`[WEBHOOK] Labels applied: ${successfulLabels}/${labelResults.length}`)
    } else {
      console.log(`[WEBHOOK] Auto-label is DISABLED, skipping label application`)
    }

    const toRespondEmails = validMessages.filter(email => 
      categories[email.id] === 'TO_RESPOND'
    )

    if (toRespondEmails.length > 0) {
      console.log(`[WEBHOOK] Generating ${toRespondEmails.length} draft(s)... (autoDraftEnabled: ${userSettings?.autoDraftEnabled})`)
      console.log(`[WEBHOOK] Note: Draft generation is ALWAYS ON for testing`)

      const draftSettings = (userSettings.draftSettings as any) || {}

      await Promise.all(
        toRespondEmails.map(async (email) => {
          try {
            const draftPrompt = `Generate a professional email reply.

USER PREFERENCES (apply these):
${JSON.stringify(draftSettings, null, 2)}

Email to reply to:
From: ${email.from}
Subject: ${email.subject}
Content: ${email.bodyText || email.snippet}

Write a reply keeping user preferences in mind.
Return ONLY the reply text.`

            let draftBody = ''
            
            try {
              const { text: draftText } = await generateText({
                model: google('gemini-2.5-flash'),
                prompt: draftPrompt,
                temperature: 0.7,
              })
              draftBody = draftText.trim()
            } catch (aiError) {
              console.error(`[WEBHOOK ERROR] AI draft generation failed for ${email.id}:`, aiError)
              console.log(`[WEBHOOK] Skipping draft for: ${email.subject}`)
              return { emailId: email.id, success: false, skipped: true }
            }

            if (!draftBody) {
              console.log(`[WEBHOOK] Empty draft body, skipping: ${email.subject}`)
              return { emailId: email.id, success: false, skipped: true }
            }

             
            console.log(`\n[WEBHOOK DRAFT] Generated for: "${email.subject}"`)
            console.log(`[WEBHOOK DRAFT] To: ${email.from}`)
            console.log(`[WEBHOOK DRAFT] Content:\n${draftBody}\n`)

            const toEmail = extractEmailAddress(email.from)
            const subject = email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`
            
            const emailContent = [
              `To: ${toEmail}`,
              `Subject: ${subject}`,
              'MIME-Version: 1.0',
              'Content-Type: text/plain; charset=utf-8',
              '',
              draftBody
            ].join('\r\n')

            const encodedEmail = Buffer.from(emailContent)
              .toString('base64')
              .replace(/\+/g, '-')
              .replace(/\//g, '_')
              .replace(/=+$/, '')

            const draftResponse = await fetch(
              'https://www.googleapis.com/gmail/v1/users/me/drafts',
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  message: { 
                    raw: encodedEmail,
                    threadId: email.threadId
                  }
                })
              }
            )

            if (draftResponse.ok) {
              const draftData = await draftResponse.json()
              console.log(`[WEBHOOK] Draft created successfully in Gmail`)
              console.log(`[WEBHOOK] Draft ID: ${draftData.id}`)
              console.log(`[WEBHOOK] Subject: ${email.subject}`)
              return { emailId: email.id, success: true, draftId: draftData.id }
            } else {
              const errorData = await draftResponse.text()
              console.error(`[WEBHOOK ERROR] Failed to create draft: ${email.subject}`)
              console.error(`[WEBHOOK ERROR] Gmail error: ${errorData}`)
              return { emailId: email.id, success: false }
            }
          } catch (err) {
            console.error(`[WEBHOOK ERROR] Error creating draft for ${email.id}:`, err)
          }
        })
      )

      const successfulDrafts = toRespondEmails.length
      console.log(`\n[WEBHOOK] Draft generation summary:`)
      console.log(`  Total TO_RESPOND emails: ${toRespondEmails.length}`)
      console.log(`  Drafts attempted: ${toRespondEmails.length}`)
    }
    
    console.log(`\n[WEBHOOK] ===== PROCESSING COMPLETE =====`)
    console.log(`[WEBHOOK] Total messages processed: ${validMessages.length}`)
    console.log(`[WEBHOOK] Messages categorized: ${Object.keys(categories).length}`)
    console.log(`[WEBHOOK] TO_RESPOND emails: ${toRespondEmails.length}`)
    console.log(`[WEBHOOK] Auto-label enabled: ${userSettings?.autoLabelEnabled ? 'YES' : 'NO'}`)
    console.log(`[WEBHOOK] Auto-draft enabled: ${userSettings?.autoDraftEnabled ? 'YES' : 'NO'}`)
    console.log(`[WEBHOOK] ================================\n`)
 
    return NextResponse.json({ 
      success: true,
      processed: validMessages.length,
      categorized: Object.keys(categories).length,
      draftsGenerated: toRespondEmails.length
    }, { status: 200 })
    
  } catch (error) {
    console.error('[WEBHOOK ERROR] Webhook error:', error)
    return NextResponse.json({ success: false }, { status: 200 })
  }
}

 export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    endpoint: 'gmail-webhook',
    message: 'Gmail webhook endpoint is ready'
  })
}

function extractEmailAddress(from: string): string {
  const match = from.match(/<(.+?)>/)
  return match ? match[1] : from
}

