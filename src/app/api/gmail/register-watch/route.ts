import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { registerGmailWatch } from '@/lib/gmail-watch'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
 
export async function POST() {
  try {
    
    const supabase = await createClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const providerToken = session.provider_token
    
    if (!providerToken) {
      return NextResponse.json(
        { 
          error: 'No Google access token found',
          help: 'Please ensure "Return provider tokens" is enabled in Supabase settings'
        },
        { status: 400 }
      )
    }

    const userId = session.user.id
    const userEmail = session.user.email

    console.log('Registering Gmail watch for user:', userEmail)

     const watchResponse = await registerGmailWatch({
      accessToken: providerToken,
      refreshToken: session.provider_refresh_token || undefined,
      userId
    })

     try {
      await prisma.profile.update({
        where: { id: userId },
        data: {
          gmailHistoryId: watchResponse.historyId,
          updatedAt: new Date()
        }
      })
      
      console.log(`Updated historyId for user ${userEmail}: ${watchResponse.historyId}`)
    } catch (dbError) {
      console.error('Failed to update user profile with historyId:', dbError)
     }

     const expirationMs = parseInt(watchResponse.expiration)
    const expirationDate = new Date(expirationMs)
    const daysUntilExpiration = Math.floor(
      (expirationMs - Date.now()) / (1000 * 60 * 60 * 24)
    )

    return NextResponse.json({
      success: true,
      message: 'Gmail watch registered successfully',
      historyId: watchResponse.historyId,
      expiration: watchResponse.expiration,
      expirationDate: expirationDate.toISOString(),
      daysUntilExpiration,
      userEmail
    })

  } catch (error) {
    console.error('Error registering Gmail watch:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to register Gmail watch',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
 
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = session.user.id

    
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: {
        gmailHistoryId: true,
        email: true,
        updatedAt: true
      }
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({
      hasWatch: !!profile.gmailHistoryId,
      historyId: profile.gmailHistoryId,
      email: profile.email,
      lastUpdated: profile.updatedAt
    })

  } catch (error) {
    console.error('Error getting watch status:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to get watch status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

