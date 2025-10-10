import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

    const body = await request.json()
    const { name, color } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Label name is required' },
        { status: 400 }
      )
    }

 
    const gmailColor = {
      backgroundColor: color || '#4a86e8',
      textColor: '#ffffff'
    }

    // Create label in Gmail
    const response = await fetch(
      'https://www.googleapis.com/gmail/v1/users/me/labels',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${providerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
          color: gmailColor
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { 
          error: 'Failed to create label',
          details: errorData 
        },
        { status: response.status }
      )
    }

    const label = await response.json()

    return NextResponse.json({ 
      success: true,
      label: {
        id: label.id,
        name: label.name
      }
    })

  } catch (error) {
    console.error('Error creating label:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

