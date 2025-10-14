import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const providerToken = session.provider_token
    
    if (!providerToken) {
      return NextResponse.json({ error: 'No Google access token found' }, { status: 400 })
    }

    const labelsResponse = await fetch(
      'https://www.googleapis.com/gmail/v1/users/me/labels',
      {
        headers: { 'Authorization': `Bearer ${providerToken}` },
      }
    )

    if (!labelsResponse.ok) {
      const errorData = await labelsResponse.json()
      return NextResponse.json(
        { error: 'Failed to fetch labels from Gmail', details: errorData },
        { status: labelsResponse.status }
      )
    }

    const labelsData = await labelsResponse.json()
    
    return NextResponse.json({ 
      labels: labelsData.labels || [],
      toRespondLabel: labelsData.labels?.find((l: { name: string }) => l.name.includes('to respond') || l.name.includes('1:'))
    })

  } catch (error) {
    console.error('Error fetching Gmail labels:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
