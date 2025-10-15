import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { registerGmailWatch } from '@/lib/gmail-watch'

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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.session) {
       if (data.session.provider_token) {
        const userId = data.session.user.id
        const providerToken = data.session.provider_token
        const refreshToken = data.session.provider_refresh_token || undefined
        
        try {
           console.log('Registering Gmail watch for user:', data.session.user.email)
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
          console.log('Stored Google tokens and historyId in database')
          console.log('Gmail watch expires:', new Date(parseInt(watchResponse.expiration)).toISOString())
        } catch (dbError) {
          console.error('Failed to store tokens or register watch:', dbError)
        }

         const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
        fetch(`${baseUrl}/api/gmail/auto-label`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            providerToken: providerToken,
            userId: userId
          })
        }).catch(err => {
          console.error('Background auto-label failed:', err)
        })
      }
      return response
    }
  }

  return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
}
