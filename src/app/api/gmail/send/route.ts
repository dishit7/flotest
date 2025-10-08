import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface SendEmailRequest {
  to: string
  subject: string
  body: string
  threadId?: string
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
      return NextResponse.json(
        { error: 'No Google access token found' },
        { status: 400 }
      )
    }

    const body: SendEmailRequest = await request.json()
    const { to, subject, body: emailBody, threadId } = body

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, body' },
        { status: 400 }
      )
    }

    const userEmail = session.user?.email
    if (!userEmail) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 })
    }
    const emailLines = [
      `From: ${userEmail}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '',
      emailBody
    ]

    const email = emailLines.join('\r\n')

    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    const requestBody: { raw: string; threadId?: string } = { raw: encodedEmail }
    if (threadId) {
      requestBody.threadId = threadId
    }
    const sendResponse = await fetch(
      'https://www.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${providerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    )

    if (!sendResponse.ok) {
      const errorData = await sendResponse.json()
      console.error('Gmail API error:', errorData)
      return NextResponse.json(
        { 
          error: 'Failed to send email',
          details: errorData 
        },
        { status: sendResponse.status }
      )
    }

    const sentMessage = await sendResponse.json()

    return NextResponse.json({ 
      success: true,
      messageId: sentMessage.id,
      threadId: sentMessage.threadId
    })

  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

