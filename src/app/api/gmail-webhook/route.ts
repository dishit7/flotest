import { NextResponse } from 'next/server'

interface PubSubMessage {
  message: {
    data: string
    messageId: string
    publishTime: string
  }
  subscription: string
}

interface GmailNotification {
  emailAddress: string
  historyId: string
}

export async function POST(request: Request) {
  try {
     const body: PubSubMessage = await request.json()
    
     const decodedData = Buffer.from(body.message.data, 'base64').toString('utf-8')
    const notification: GmailNotification = JSON.parse(decodedData)
    
     const { emailAddress, historyId } = notification
    
 
     console.log('email', emailAddress)
    console.log('history', historyId)
    console.log('msg:', body.message.messageId)
    console.log('pub time', body.message.publishTime)
    console.log('notification:', JSON.stringify(notification, null, 2))
 
    return NextResponse.json({ 
      success: true,
      message: 'Webhook received',
      emailAddress,
      historyId 
    }, { status: 200 })
    
  } catch (error) {
    console.error('Error processing Gmail webhook:', error)
    
     return NextResponse.json({ 
      success: false,
      error: 'Failed to process webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 200 })
  }
}

 export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    endpoint: 'gmail-webhook',
    message: 'Gmail webhook endpoint is ready'
  })
}

