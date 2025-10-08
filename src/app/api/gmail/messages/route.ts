import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
    body?: {
      data?: string
      size: number
    }
    parts?: Array<{
      mimeType: string
      body?: {
        data?: string
        size: number
      }
      parts?: any[]
    }>
    mimeType: string
  }
  internalDate: string
  sizeEstimate: number
}

interface GmailListResponse {
  messages: GmailMessage[]
  nextPageToken?: string
  resultSizeEstimate: number
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const providerToken = session.provider_token
    
    console.log('=== DEBUG SESSION INFO ===')
    console.log('Session exists:', !!session)
    console.log('Provider token exists:', !!providerToken)
    console.log('User email:', session.user?.email)
    
    if (providerToken) {
      try {
        const tokenInfoResponse = await fetch(
          `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${providerToken}`
        )
        const tokenInfo = await tokenInfoResponse.json()
        console.log('Token Info:', JSON.stringify(tokenInfo, null, 2))
      } catch (e) {
        console.log('Could not get token info:', e)
      }
    }
    
    if (!providerToken) {
      return NextResponse.json(
        { 
          error: 'No Google access token found. Please enable "Return provider tokens" in Supabase dashboard settings.',
          help: 'Go to Authentication → Settings → Enable "Return provider tokens"'
        },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const maxResults = searchParams.get('maxResults') || '10'

    const messagesResponse = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
      {
        headers: { 'Authorization': `Bearer ${providerToken}` },
      }
    )

    if (!messagesResponse.ok) {
      const errorData = await messagesResponse.json()
      return NextResponse.json(
        { error: 'Failed to fetch messages from Gmail', details: errorData },
        { status: messagesResponse.status }
      )
    }

    const messagesData: GmailListResponse = await messagesResponse.json()

    if (!messagesData.messages || messagesData.messages.length === 0) {
      return NextResponse.json({ emails: [] })
    }

    const decodeBase64Url = (data: string): string => {
      try {
        const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
        const padding = base64.length % 4
        const paddedBase64 = padding ? base64 + '='.repeat(4 - padding) : base64
        return Buffer.from(paddedBase64, 'base64').toString('utf-8')
      } catch (e) {
        console.error('Error decoding base64:', e)
        return ''
      }
    }

    const extractEmailBody = (payload: GmailMessageDetail['payload']): { html: string; text: string } => {
      let htmlBody = ''
      let textBody = ''

      const findBodyParts = (parts: any[]): void => {
        for (const part of parts) {
          if (part.mimeType === 'text/html' && part.body?.data) {
            htmlBody = decodeBase64Url(part.body.data)
          } else if (part.mimeType === 'text/plain' && part.body?.data) {
            textBody = decodeBase64Url(part.body.data)
          } else if (part.parts) {
            findBodyParts(part.parts)
          }
        }
      }

      if (payload.body?.data) {
        if (payload.mimeType === 'text/html') {
          htmlBody = decodeBase64Url(payload.body.data)
        } else if (payload.mimeType === 'text/plain') {
          textBody = decodeBase64Url(payload.body.data)
        }
      }

      if (payload.parts) {
        findBodyParts(payload.parts)
      }

      return { html: htmlBody, text: textBody }
    }

    const emailDetailsPromises = messagesData.messages.map(async (message) => {
      const detailResponse = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
        {
          headers: { 'Authorization': `Bearer ${providerToken}` },
        }
      )

      if (!detailResponse.ok) return null

      const detail: GmailMessageDetail = await detailResponse.json()
      const headers = detail.payload.headers
      const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || 'Unknown'
      const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '(No Subject)'
      const date = headers.find(h => h.name.toLowerCase() === 'date')?.value || detail.internalDate
      const { html, text } = extractEmailBody(detail.payload)

      return {
        id: detail.id,
        threadId: detail.threadId,
        from,
        subject,
        snippet: detail.snippet,
        body: { html: html || '', text: text || '' },
        date,
        isUnread: detail.labelIds?.includes('UNREAD') || false,
        labels: detail.labelIds || [],
        sizeEstimate: detail.sizeEstimate,
      }
    })

    const emails = (await Promise.all(emailDetailsPromises)).filter(email => email !== null)
    return NextResponse.json({ emails })

  } catch (error) {
    console.error('Error fetching Gmail messages:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

