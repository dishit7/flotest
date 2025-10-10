import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

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
        try {
          await prisma.profile.update({
            where: { id: data.session.user.id },
            data: {
              googleAccessToken: data.session.provider_token,
              googleRefreshToken: data.session.provider_refresh_token || null,
            }
          })
          console.log('Stored Google tokens in database')
        } catch (dbError) {
          console.error('Failed to store tokens:', dbError)
        }

         const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
        fetch(`${baseUrl}/api/gmail/auto-label`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            providerToken: data.session.provider_token
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
