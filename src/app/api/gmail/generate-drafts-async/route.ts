import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'

// This endpoint can be called asynchronously (fire-and-forget)
// No waiting for response - drafts generated in background
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const providerToken = session.provider_token
    if (!providerToken) {
      return NextResponse.json({ error: 'No token' }, { status: 400 })
    }

    const body = await request.json()
    const { emailIds } = body // Array of email IDs to generate drafts for

    if (!emailIds || emailIds.length === 0) {
      return NextResponse.json({ message: 'No emails to process' })
    }

    // Return immediately - processing happens in background
    // In production, this would trigger a background job
    setImmediate(async () => {
      try {
        console.log(`Background: Generating ${emailIds.length} drafts...`)
        
        // Fetch email details
        const emailDetailsPromises = emailIds.map(async (id: string) => {
          const response = await fetch(
            `https://www.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata`,
            { headers: { 'Authorization': `Bearer ${providerToken}` } }
          )
          if (!response.ok) return null
          const detail = await response.json()
          const headers = detail.payload.headers
          return {
            id: detail.id,
            threadId: detail.threadId,
            from: headers.find((h: { name: string; value: string }) => h.name.toLowerCase() === 'from')?.value,
            subject: headers.find((h: { name: string; value: string }) => h.name.toLowerCase() === 'subject')?.value,
            snippet: detail.snippet
          }
        })

        const emails = (await Promise.all(emailDetailsPromises)).filter(e => e !== null)

        // Generate and create drafts
        for (const email of emails) {
          try {
            const draftPrompt = `Generate a professional, concise reply to:
From: ${email.from}
Subject: ${email.subject}
Content: ${email.snippet}

Return ONLY the draft reply text.`

            const { text: draftText } = await generateText({
              model: google('gemini-2.5-flash'),
              prompt: draftPrompt,
              temperature: 0.7,
            })

            const draft = draftText.trim()
            const toEmail = extractEmailAddress(email.from)
            const subject = email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`
            
            const emailLines = [
              `To: ${toEmail}`,
              `Subject: ${subject}`,
              'MIME-Version: 1.0',
              'Content-Type: text/plain; charset=utf-8',
              '',
              draft
            ]

            const emailContent = emailLines.join('\r\n')
            const encodedEmail = Buffer.from(emailContent)
              .toString('base64')
              .replace(/\+/g, '-')
              .replace(/\//g, '_')
              .replace(/=+$/, '')

            const draftPayload: { message: { raw: string; threadId?: string } } = { message: { raw: encodedEmail } }
            if (email.threadId) draftPayload.message.threadId = email.threadId

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
              console.log(`Background: Draft created for ${email.subject}`)
            }
          } catch (error) {
            console.error(`Background: Failed to create draft:`, error)
          }
        }

        console.log(`Background: Finished generating drafts`)
      } catch (error) {
        console.error('Background draft generation error:', error)
      }
    })

    // Return immediately
    return NextResponse.json({ 
      success: true,
      message: 'Draft generation started in background',
      emailCount: emailIds.length
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

function extractEmailAddress(from: string): string {
  const match = from.match(/<(.+?)>/)
  return match ? match[1] : from
}

