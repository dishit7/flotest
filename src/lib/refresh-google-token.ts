import { prisma } from '@/lib/prisma'
import axios from 'axios'

interface RefreshTokenResponse {
  access_token: string
  expires_in: number
  scope: string
  token_type: string
}

export async function getValidGoogleToken(userId: string): Promise<string | null> {
  try {
    console.log('[TOKEN] Fetching tokens from DB for user:', userId)
    
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: {
        googleAccessToken: true,
        googleRefreshToken: true,
      }
    })

    console.log('[TOKEN] Profile found:', !!profile)
    console.log('[TOKEN] Access token exists:', !!profile?.googleAccessToken)
    console.log('[TOKEN] Refresh token exists:', !!profile?.googleRefreshToken)
    
    if (profile?.googleAccessToken) {
      console.log('[TOKEN] Access token (first 20 chars):', profile.googleAccessToken.substring(0, 20))
    }
    if (profile?.googleRefreshToken) {
      console.log('[TOKEN] Refresh token (first 20 chars):', profile.googleRefreshToken.substring(0, 20))
    }

    if (!profile?.googleAccessToken || !profile?.googleRefreshToken) {
      console.error('[TOKEN] Missing tokens - accessToken:', !!profile?.googleAccessToken, 'refreshToken:', !!profile?.googleRefreshToken)
      return null
    }

    const accessToken = profile.googleAccessToken
    const refreshToken = profile.googleRefreshToken

    const testResponse = await axios.get(
      'https://www.googleapis.com/gmail/v1/users/me/profile',
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    )

    if (testResponse.status === 200) {
      return accessToken
    }

    console.log('[TOKEN] Access token expired, refreshing...')
    console.log('[TOKEN] GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID)
    console.log('[TOKEN] GOOGLE_CLIENT_SECRET exists:', !!process.env.GOOGLE_CLIENT_SECRET)
    console.log('[TOKEN] Using refresh token (first 20 chars):', refreshToken.substring(0, 20))

    const refreshResponse = await axios.post('https://oauth2.googleapis.com/token', 
      new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    )

    if (refreshResponse.status !== 200) {
      console.error('[TOKEN ERROR] Failed to refresh:', JSON.stringify(refreshResponse.data))
      return null
    }

    const tokens: RefreshTokenResponse = refreshResponse.data
    const newAccessToken = tokens.access_token

    await prisma.profile.update({
      where: { id: userId },
      data: { googleAccessToken: newAccessToken }
    })

    console.log('[TOKEN] Refreshed successfully')

    return newAccessToken

  } catch (error) {
    console.error('[TOKEN ERROR]', error)
    return null
  }
}

