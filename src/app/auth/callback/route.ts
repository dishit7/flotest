import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { registerGmailWatch } from '@/lib/gmail-watch'
import { enqueueCategorization } from '@/lib/queue-helpers'
import axios from 'axios'

console.log('[AUTH_CALLBACK] Route loaded successfully')

export async function GET(request: NextRequest) {
  console.log('[AUTH_CALLBACK] ========== AUTH CALLBACK STARTED ==========')
  console.log('[AUTH_CALLBACK] Request URL:', request.url)
  
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  console.log('[AUTH_CALLBACK] Code received:', !!code)
  console.log('[AUTH_CALLBACK] Code value:', code ? code.substring(0, 20) + '...' : 'null')

  if (code) {
    console.log('[AUTH_CALLBACK] Code found, creating redirect response...')
    const response = NextResponse.redirect(new URL('/dashboard', request.url))
    
    console.log('[AUTH_CALLBACK] Creating Supabase client...')
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

    console.log('[AUTH_CALLBACK] Exchanging code for session...')
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      console.log('[AUTH_CALLBACK] Session exchange result:', { 
        hasError: !!error, 
        errorMessage: error?.message,
        hasSession: !!data?.session,
        hasUser: !!data?.session?.user 
      })
      
      if (error) {
        console.error('[AUTH_CALLBACK] Session exchange error:', error)
        console.log('[AUTH_CALLBACK] Redirecting to auth-code-error due to session exchange error')
        return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
      }
      
      if (!data.session) {
        console.error('[AUTH_CALLBACK] No session in response')
        console.log('[AUTH_CALLBACK] Redirecting to auth-code-error due to missing session')
        return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
      }

      console.log('[AUTH_CALLBACK] Session created successfully for user:', data.session.user.email)
      console.log('[AUTH_CALLBACK] Has provider token:', !!data.session.provider_token)
      
      if (data.session.provider_token) {
        const userId = data.session.user.id
        const providerToken = data.session.provider_token
        const refreshToken = data.session.provider_refresh_token || undefined
        
        console.log('[AUTH_CALLBACK] Starting Gmail watch registration...')
        try {
          const watchResponse = await registerGmailWatch({
            accessToken: providerToken,
            refreshToken,
            userId
          })
          console.log('[AUTH_CALLBACK] Gmail watch registered successfully')
          
          console.log('[AUTH_CALLBACK] Storing tokens in database...')
          await prisma.profile.update({
            where: { id: userId },
            data: {
              googleAccessToken: providerToken,
              googleRefreshToken: refreshToken || null,
              gmailHistoryId: watchResponse.historyId,
            }
          })
          console.log('[AUTH_CALLBACK] Tokens stored successfully')
          console.log('[AUTH_CALLBACK] Gmail watch expires:', new Date(parseInt(watchResponse.expiration)).toISOString())
        } catch (dbError) {
          console.error('[AUTH_CALLBACK] Failed to store tokens or register watch:', dbError)
        }

        console.log('[AUTH_CALLBACK] Enqueuing initial email categorization...')
        try {
          // Get recent emails to categorize (last 50 emails)
          const gmailResponse = await axios.get(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50`, {
            headers: {
              'Authorization': `Bearer ${providerToken}`,
              'Content-Type': 'application/json'
            }
          })

          if (gmailResponse.status === 200) {
            const gmailData = gmailResponse.data
            const emailIds = gmailData.messages?.map((msg: any) => msg.id) || []
            
            if (emailIds.length > 0) {
              console.log(`[AUTH_CALLBACK] Enqueuing categorization for ${emailIds.length} emails`)
              await enqueueCategorization(userId, providerToken, emailIds)
              console.log('[AUTH_CALLBACK] Email categorization enqueued successfully')
            } else {
              console.log('[AUTH_CALLBACK] No emails found to categorize')
            }
          } else {
            console.error('[AUTH_CALLBACK] Failed to fetch emails for categorization:', gmailResponse.status)
          }
        } catch (queueError) {
          console.error('[AUTH_CALLBACK] Failed to enqueue email categorization:', queueError)
        }
      }
      
      console.log('[AUTH_CALLBACK] ========== RETURNING REDIRECT TO DASHBOARD ==========')
      return response
      
    } catch (authError) {
      console.error('[AUTH_CALLBACK] Unexpected error during auth:', authError)
      console.log('[AUTH_CALLBACK] Redirecting to auth-code-error due to unexpected error')
      return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
    }
  } else {
    console.log('[AUTH_CALLBACK] No code provided in URL')
  }

  console.log('[AUTH_CALLBACK] Redirecting to auth-code-error')
  return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
}
