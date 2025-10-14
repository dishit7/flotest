import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { LabelsRecord, LabelConfig } from '@/types/labels'

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { labelKey, enabled } = await request.json()

    if (!labelKey || enabled === undefined) {
      return NextResponse.json({ error: 'Missing labelKey or enabled field' }, { status: 400 })
    }

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      select: { labels: true }
    })

    const labels = (userSettings?.labels as unknown as LabelsRecord) || {}

    if (!labels[labelKey]) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 })
    }

    (labels[labelKey] as LabelConfig).enabled = enabled

    await prisma.userSettings.update({
      where: { userId: user.id },
      data: { labels: labels as never }
    })

    return NextResponse.json({ 
      success: true,
      message: `Label ${enabled ? 'enabled' : 'disabled'} successfully`
    })

  } catch (error) {
    console.error('Error toggling label:', error)
    return NextResponse.json(
      { error: 'Failed to toggle label' },
      { status: 500 }
    )
  }
}

