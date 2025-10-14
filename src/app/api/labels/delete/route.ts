import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { LabelConfig, LabelsRecord, CustomizationRecord } from '@/types/labels'

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { labelKey } = await request.json()

    if (!labelKey) {
      return NextResponse.json({ error: 'Label key is required' }, { status: 400 })
    }

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      select: { labels: true, labelCustomization: true }
    })

    const labels = (userSettings?.labels as unknown as LabelsRecord) || {}
    const customization = (userSettings?.labelCustomization as unknown as CustomizationRecord) || {}

    if (!labels[labelKey]) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 })
    }

    const label = labels[labelKey] as LabelConfig
    const gmailLabelId = label.id

    const { data: { session } } = await supabase.auth.getSession()
    const providerToken = session?.provider_token

    if (providerToken && gmailLabelId) {
      try {
        await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/labels/${gmailLabelId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${providerToken}`,
            }
          }
        )
      } catch (gmailError) {
        console.error('Failed to delete Gmail label:', gmailError)
      }
    }

    delete labels[labelKey]
    delete customization[labelKey]

    await prisma.userSettings.update({
      where: { userId: user.id },
      data: { 
        labels: labels as never,
        labelCustomization: customization as never
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Label deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting label:', error)
    return NextResponse.json(
      { error: 'Failed to delete label' },
      { status: 500 }
    )
  }
}

