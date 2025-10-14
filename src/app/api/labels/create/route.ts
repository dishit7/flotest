import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { LabelsRecord } from '@/types/labels'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { name, color } = await request.json()

    if (!name || !color) {
      return NextResponse.json({ error: 'Name and color are required' }, { status: 400 })
    }

    const { data: { session } } = await supabase.auth.getSession()
    const providerToken = session?.provider_token

    if (!providerToken) {
      return NextResponse.json({ error: 'No Gmail access token' }, { status: 401 })
    }

    const gmailColorPalette: Record<string, { backgroundColor: string; textColor: string }> = {
      'red': { backgroundColor: '#fb4c2f', textColor: '#ffffff' },
      'orange': { backgroundColor: '#f691b2', textColor: '#ffffff' },
      'yellow': { backgroundColor: '#fad165', textColor: '#000000' },
      'green': { backgroundColor: '#16a765', textColor: '#ffffff' },
      'blue': { backgroundColor: '#4a86e8', textColor: '#ffffff' },
      'purple': { backgroundColor: '#a479e2', textColor: '#ffffff' },
      'gray': { backgroundColor: '#cca6ac', textColor: '#ffffff' },
      'pink': { backgroundColor: '#ff7537', textColor: '#ffffff' },
      'teal': { backgroundColor: '#42d692', textColor: '#ffffff' },
      'brown': { backgroundColor: '#8d6e63', textColor: '#ffffff' }
    }

    const gmailColor = gmailColorPalette[color] || gmailColorPalette['blue']

    const createLabelResponse = await fetch(
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

    if (!createLabelResponse.ok) {
      const errorData = await createLabelResponse.json()
      return NextResponse.json(
        { error: 'Failed to create label in Gmail', details: errorData },
        { status: createLabelResponse.status }
      )
    }

    const labelData = await createLabelResponse.json()

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      select: { labels: true }
    })

    const labels = (userSettings?.labels as unknown as LabelsRecord) || {}
    const labelKey = name.toLowerCase().replace(/\s+/g, '_')

    labels[labelKey] = {
      id: labelData.id,
      name: name,
      color: color,
      enabled: true,
      isCustom: true
    }

    await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        labels: labels as never
      },
      update: {
        labels: labels as never
      }
    })

    return NextResponse.json({
      success: true,
      label: {
        key: labelKey,
        id: labelData.id,
        name: name,
        color: color,
        enabled: true,
        isCustom: true
      }
    })

  } catch (error) {
    console.error('Error creating label:', error)
    return NextResponse.json(
      { error: 'Failed to create label' },
      { status: 500 }
    )
  }
}

