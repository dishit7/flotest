import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { CustomizationRecord } from '@/types/labels'

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { labelKey, rules } = await request.json()

    if (!labelKey) {
      return NextResponse.json({ error: 'Label key is required' }, { status: 400 })
    }

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      select: { labelCustomization: true }
    })

    const customization = (userSettings?.labelCustomization as unknown as CustomizationRecord) || {}
    customization[labelKey] = rules

    await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        labelCustomization: customization as never
      },
      update: {
        labelCustomization: customization as never
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Label customization saved successfully'
    })

  } catch (error) {
    console.error('Error saving label customization:', error)
    return NextResponse.json(
      { error: 'Failed to save customization' },
      { status: 500 }
    )
  }
}

