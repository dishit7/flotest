import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {prisma} from '@/lib/prisma'

export interface DraftSettings {
   draftTone: 'professional' | 'friendly' | 'casual' | 'formal' | 'direct';
  draftLength: 'short' | 'medium' | 'long';
  includeGreeting: boolean;
  includeClosing: boolean;
  
   customInstructions?: string;
  signatureTemplate?: string;
  
   responseStyle?: 'direct' | 'empathetic' | 'detailed';
  useEmojis?: boolean;
  formalityLevel?: number; 
  avoidWords?: string[];
  preferredPhrases?: string[];
}
 const DEFAULT_SETTINGS: DraftSettings = {
  draftTone: 'professional',
  draftLength: 'medium',
  includeGreeting: true,
  includeClosing: true,
  formalityLevel: 3,
  responseStyle: 'detailed',
  useEmojis: false,
  avoidWords: [],
  preferredPhrases: [],
}

 export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { 
        settings: {
          select: { draftSettings: true }
        }
      }
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

     const settings = profile.settings?.draftSettings 
      ? { ...DEFAULT_SETTINGS, ...(profile.settings.draftSettings as object) }
      : DEFAULT_SETTINGS

    return NextResponse.json({ settings })

  } catch (error) {
    console.error('Error fetching draft settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

 export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const settings: Partial<DraftSettings> = await request.json()

 
    await prisma.profile.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email!,
        fullName: user.user_metadata?.full_name || user.user_metadata?.name,
        avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      },
      update: {}  
    })

     const existingSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id }
    })

    if (existingSettings) {
      await prisma.userSettings.update({
        where: { userId: user.id },
        data: { 
          draftSettings: settings as any  
        }
      })
    } else {
      await prisma.userSettings.create({
        data: {
          userId: user.id,
          draftSettings: settings as any
        }
      })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Draft settings saved successfully' 
    })

  } catch (error) {
    console.error('Error saving draft settings:', error)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}

