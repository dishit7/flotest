import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface CreateDraftRequest {
  to: string
  subject: string
  body: string
  threadId?: string
  inReplyTo?: string
  references?: string
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

    const body: CreateDraftRequest = await request.json()
    const { to, subject, body: emailBody, threadId, inReplyTo, references } = body

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
    ]
 
    if (inReplyTo) {
      emailLines.push(`In-Reply-To: ${inReplyTo}`)
    }
    if (references) {
      emailLines.push(`References: ${references}`)
    }

    emailLines.push('', emailBody)

    const email = emailLines.join('\r\n')
 
    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

 
    const draftBody: { message: { raw: string; threadId?: string } } = {
      message: { raw: encodedEmail }
    }
    
    if (threadId) {
      draftBody.message.threadId = threadId
    }

   
    const draftResponse = await fetch(
      'https://www.googleapis.com/gmail/v1/users/me/drafts',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${providerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(draftBody)
      }
    )

    if (!draftResponse.ok) {
      const errorData = await draftResponse.json()
      console.error('Gmail API error:', errorData)
      return NextResponse.json(
        { 
          error: 'Failed to create draft',
          details: errorData 
        },
        { status: draftResponse.status }
      )
    }

    const draft = await draftResponse.json()

    return NextResponse.json({ 
      success: true,
      draftId: draft.id,
      messageId: draft.message?.id,
      threadId: draft.message?.threadId
    })

  } catch (error) {
    console.error('Error creating draft:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

