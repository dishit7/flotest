import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'

export const EMAIL_CATEGORIES = {
  IMPORTANT: {
    label: 'Important',
    color: 'red',
    description: 'Critical emails requiring immediate attention, urgent matters, deadlines'
  },
  OPPORTUNITY: {
    label: 'New Opportunity',
    color: 'green',
    description: 'Business opportunities, potential deals, partnership proposals, job offers'
  },
  SALES: {
    label: 'Sales & Marketing',
    color: 'blue',
    description: 'Sales pitches, marketing emails, promotional content, newsletters'
  },
  PERSONAL: {
    label: 'Personal',
    color: 'purple',
    description: 'Personal communications, family, friends, casual conversations'
  },
  INFORMATIONAL: {
    label: 'Informational',
    color: 'yellow',
    description: 'Updates, notifications, receipts, confirmations, general information'
  },
  SPAM: {
    label: 'Low Priority',
    color: 'gray',
    description: 'Spam, unwanted emails, automated messages, low-value content'
  }
} as const

export type EmailCategory = keyof typeof EMAIL_CATEGORIES

interface CategorizeRequest {
  emails: Array<{
    id: string
    from: string
    subject: string
    snippet: string
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
  "email-id-1": "IMPORTANT",
  "email-id-2": "SALES",
  "email-id-3": "PERSONAL"
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
        acc[email.id] = 'INFORMATIONAL'
        return acc
      }, {} as Record<string, EmailCategory>)
    }

    return NextResponse.json({ categories })

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

