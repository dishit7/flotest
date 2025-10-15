export interface GmailWatchRequest {
  labelIds?: string[]
  labelFilterBehavior?: 'INCLUDE' | 'EXCLUDE'
  topicName: string
}

export interface GmailWatchResponse {
  historyId: string
  expiration: string
}

export interface WatchRegistrationParams {
  accessToken: string
  refreshToken?: string
  userId?: string
}

const GMAIL_API_BASE = 'https://www.googleapis.com/gmail/v1'
const TOPIC_NAME = 'projects/flobase-474302/topics/gmail-notifications'

export async function registerGmailWatch(
  params: WatchRegistrationParams
): Promise<GmailWatchResponse> {
  const { accessToken } = params
  
  const watchRequest: GmailWatchRequest = {
    labelIds: ['INBOX'],
    labelFilterBehavior: 'INCLUDE',
    topicName: TOPIC_NAME
  }
  
  try {
    console.log('Registering Gmail watch...')
    console.log('Topic:', TOPIC_NAME)
    console.log('Label IDs:', watchRequest.labelIds)
    
    const response = await fetch(`${GMAIL_API_BASE}/users/me/watch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(watchRequest)
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      console.error('Gmail watch registration failed:', errorData)
      throw new Error(`Failed to register Gmail watch: ${JSON.stringify(errorData)}`)
    }
    
    const watchResponse: GmailWatchResponse = await response.json()
    
    console.log('Gmail watch registered successfully!')
    console.log('History ID:', watchResponse.historyId)
    console.log('Expiration:', watchResponse.expiration)
    
    return watchResponse
    
  } catch (error) {
    console.error('Error registering Gmail watch:', error)
    throw error
  }
}

export async function stopGmailWatch(accessToken: string): Promise<void> {
  try {
    console.log('Stopping Gmail watch...')
    
    const response = await fetch(`${GMAIL_API_BASE}/users/me/stop`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to stop Gmail watch:', errorData)
      throw new Error(`Failed to stop Gmail watch: ${JSON.stringify(errorData)}`)
    }
    
    console.log('Gmail watch stopped successfully')
    
  } catch (error) {
    console.error('Error stopping Gmail watch:', error)
    throw error
  }
}

export async function refreshGmailWatch(
  accessToken: string
): Promise<GmailWatchResponse> {
  return registerGmailWatch({ accessToken })
}

export function getWatchExpirationDate(expiration: string): Date {
  const expirationMs = parseInt(expiration)
  return new Date(expirationMs)
}

export function isWatchExpiringSoon(expiration: string): boolean {
  const expirationDate = getWatchExpirationDate(expiration)
  const now = new Date()
  const hoursUntilExpiration = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  return hoursUntilExpiration < 24
}

