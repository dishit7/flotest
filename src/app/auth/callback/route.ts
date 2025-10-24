import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { registerGmailWatch } from '@/lib/gmail-watch'
import { enqueueCategorization, enqueueSignupInitialization } from '@/lib/queue-helpers'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const response = NextResponse.redirect(new URL('/dashboard', request.url))
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return request.cookies.get(name)?.value
          },
          set(name, value, options) {
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name, options) {
            response.cookies.delete({
              name,
              ...options,
            })
          },
        },
      }
    )

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error || !data.session) {
        return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
      }

      const userId = data.session.user.id
      const providerToken = data.session.provider_token
      const refreshToken = data.session.provider_refresh_token || undefined
      
      if (providerToken) {
        try {
          const watchResponse = await registerGmailWatch({
            accessToken: providerToken,
            refreshToken,
            userId
          })
          
          await prisma.profile.update({
            where: { id: userId },
            data: {
              googleAccessToken: providerToken,
              googleRefreshToken: refreshToken || null,
              gmailHistoryId: watchResponse.historyId,
            }
          })
        } catch (dbError) {
          console.error('[AUTH_CALLBACK] Failed to store tokens or register watch:', dbError)
        }

        const userSettings = await prisma.userSettings.findUnique({
          where: { userId }
        })

        const isNewUser = !userSettings?.labels || Object.keys(userSettings.labels).length === 0

        if (isNewUser) {
          await enqueueSignupInitialization(
            userId, 
            providerToken, 
            refreshToken, 
            data.session.user.email!
          )
        } else {
          const gmailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50`, {
            headers: {
              'Authorization': `Bearer ${providerToken}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (gmailResponse.ok) {
            const gmailData = await gmailResponse.json()
            const emailIds = gmailData.messages?.map((msg: any) => msg.id) || []
            
            if (emailIds.length > 0) {
              await enqueueCategorization(userId, providerToken, emailIds)
            }
          }
        }
      }
      
      return response
      
    } catch (authError) {
      console.error('[AUTH_CALLBACK] Unexpected error during auth:', authError)
      return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
    }
  }

  return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
}
