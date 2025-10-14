import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { LabelsRecord, CustomizationRecord } from '@/types/labels'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      select: { labels: true, labelCustomization: true }
    })

    const labels = (userSettings?.labels as unknown as LabelsRecord) || {}
    const customization = (userSettings?.labelCustomization as unknown as CustomizationRecord) || {}

    return NextResponse.json({ 
      labels,
      customization
    })

  } catch (error) {
    console.error('Error fetching labels:', error)
    return NextResponse.json(
      { error: 'Failed to fetch labels' },
      { status: 500 }
    )
  }
}

