import { NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { SignupInitializationJob, CategorizeEmailJob } from '@/lib/queue-helpers'
import { getValidGoogleToken } from '@/lib/refresh-google-token'
import { prisma } from '@/lib/prisma'
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { EMAIL_CATEGORIES, type EmailCategory } from '@/lib/email-categories'

type LabelMapping = {
  id: string
  name: string
  color: string
  enabled: boolean
  isCustom: boolean
}

type UserLabels = Record<EmailCategory, LabelMapping>

interface GmailLabel {
  id: string
  name: string
}

interface GmailMessage {
  id: string
  threadId: string
}

interface GmailMessageDetail {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  payload: {
    headers: Array<{ name: string; value: string }>
  }
}

async function handler(request: Request) {
  try {
    const jobData = await request.json()
    console.log(`[WORKER] Received job: ${jobData.type} for user: ${jobData.userId}`)
    
    if (jobData.type === 'SIGNUP_INITIALIZATION') {
      const job: SignupInitializationJob = jobData
      console.log(`[WORKER] Starting SIGNUP_INITIALIZATION for user: ${job.userId}`)
      await processSignupInitialization(job)
      console.log(`[WORKER] Completed SIGNUP_INITIALIZATION for user: ${job.userId}`)
    } else if (jobData.type === 'CATEGORIZE_EMAIL') {
      const job: CategorizeEmailJob = jobData
      console.log(`[WORKER] Starting CATEGORIZE_EMAIL for user: ${job.userId}, email: ${job.emailId}`)
      await processCategorizeEmail(job)
      console.log(`[WORKER] Completed CATEGORIZE_EMAIL for user: ${job.userId}, email: ${job.emailId}`)
    } else {
      console.error(`[WORKER] Unknown job type: ${jobData.type}`)
      throw new Error(`Unknown job type: ${jobData.type}`)
    }

    console.log(`[WORKER] Job completed successfully: ${jobData.type}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[WORKER] Job failed:', error)
    return NextResponse.json(
      { error: 'Job processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function processSignupInitialization(job: SignupInitializationJob) {
  console.log(`[SIGNUP_INIT] Starting initialization for user: ${job.userId}`)
  
  const accessToken = await getValidGoogleToken(job.userId)
  if (!accessToken) throw new Error('Failed to get valid access token')

  console.log(`[SIGNUP_INIT] Creating Gmail labels...`)
  const labels = await createGmailLabels(accessToken)
  console.log(`[SIGNUP_INIT] Labels created: ${Object.keys(labels.labelsToStore).length} labels`)
  await new Promise(resolve => setTimeout(resolve, 1000)) // 1s delay after creating labels
  
  console.log(`[SIGNUP_INIT] Fetching recent emails (limit: 50)...`)
  const emails = await fetchRecentEmails(accessToken, 50)
  console.log(`[SIGNUP_INIT] Fetched ${emails.length} emails`)
  await new Promise(resolve => setTimeout(resolve, 500)) // 500ms delay after fetching emails
  
  console.log(`[SIGNUP_INIT] Categorizing emails with AI...`)
  const categories = await categorizeEmailsWithAI(emails)
  console.log(`[SIGNUP_INIT] AI categorization completed for ${Object.keys(categories).length} emails`)
  
  console.log(`[SIGNUP_INIT] Applying labels to emails...`)
  const successCount = await applyLabelsToEmails(accessToken, emails, categories, labels)
  console.log(`[SIGNUP_INIT] Label application completed: ${successCount}/${Object.keys(categories).length} successful`)
  
  console.log(`[SIGNUP_INIT] Storing label mappings to database...`)
  await storeLabelMappings(job.userId, labels)

  console.log(`[SIGNUP_INIT] Completed: ${Object.keys(labels.labelsToStore).length} labels, ${emails.length} emails, ${successCount} labeled`)
}

async function processCategorizeEmail(job: CategorizeEmailJob) {
  console.log(`[CATEGORIZE_EMAIL] Processing email ${job.emailId} for user: ${job.userId}`)
  
  const accessToken = await getValidGoogleToken(job.userId)
  if (!accessToken) throw new Error('Failed to get valid access token')
  console.log(`[CATEGORIZE_EMAIL] Access token obtained successfully`)

  const userSettings = await prisma.userSettings.findUnique({
    where: { userId: job.userId }
  })

  if (!userSettings?.labels) {
    console.log(`[CATEGORIZE_EMAIL] No user settings or labels found for user: ${job.userId}`)
    return
  }
  console.log(`[CATEGORIZE_EMAIL] User settings found with ${Object.keys(userSettings.labels).length} labels`)

  const emailDetail = await fetchEmailDetail(accessToken, job.emailId)
  if (!emailDetail) {
    console.log(`[CATEGORIZE_EMAIL] Failed to fetch email detail for: ${job.emailId}`)
    return
  }
  console.log(`[CATEGORIZE_EMAIL] Email detail fetched: ${emailDetail.subject}`)

  const category = await categorizeSingleEmailWithAI(emailDetail)
  console.log(`[CATEGORIZE_EMAIL] AI categorized email as: ${category}`)
  
  const labelId = (userSettings.labels as UserLabels)[category]?.id
  
  if (labelId) {
    console.log(`[CATEGORIZE_EMAIL] Applying label ${labelId} to email ${job.emailId}`)
    await applyLabelToEmail(accessToken, job.emailId, labelId)
    console.log(`[CATEGORIZE_EMAIL] Successfully applied label to email ${job.emailId}`)
  } else {
    console.log(`[CATEGORIZE_EMAIL] No label ID found for category: ${category}`)
  }
}

async function createGmailLabels(accessToken: string) {
  console.log(`[LABELS] Starting label creation process`)
  const labelMap = new Map<EmailCategory, string>()
  const labelsToStore: Record<string, { id: string; name: string; color: string; enabled: boolean; isCustom: boolean }> = {}
  
  console.log(`[LABELS] Fetching existing labels from Gmail...`)
  const listLabelsResponse = await fetch(
    'https://www.googleapis.com/gmail/v1/users/me/labels',
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  )
  
  let existingLabels: GmailLabel[] = []
  if (listLabelsResponse.ok) {
    const labelsData = await listLabelsResponse.json()
    existingLabels = labelsData.labels || []
    console.log(`[LABELS] Found ${existingLabels.length} existing labels`)
  } else {
    console.error(`[LABELS] Failed to fetch existing labels: ${listLabelsResponse.status}`)
  }
  
  let createdCount = 0
  let existingCount = 0
  
  for (const [key, category] of Object.entries(EMAIL_CATEGORIES)) {
    const existingLabel = existingLabels.find((l: GmailLabel) => l.name === category.label)
    
    if (existingLabel) {
      console.log(`[LABELS] Using existing label: ${category.label} (${existingLabel.id})`)
      labelMap.set(key as EmailCategory, existingLabel.id)
      labelsToStore[key] = {
        id: existingLabel.id,
        name: category.label,
        color: category.color,
        enabled: true,
        isCustom: false
      }
      existingCount++
    } else {
      console.log(`[LABELS] Creating new label: ${category.label}`)
      const createLabelResponse = await fetch(
        'https://www.googleapis.com/gmail/v1/users/me/labels',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: category.label,
            labelListVisibility: 'labelShow',
            messageListVisibility: 'show',
            color: category.gmailColor
          })
        }
      )

      if (createLabelResponse.ok) {
        const labelData: GmailLabel = await createLabelResponse.json()
        console.log(`[LABELS] Successfully created label: ${category.label} (${labelData.id})`)
        labelMap.set(key as EmailCategory, labelData.id)
        labelsToStore[key] = {
          id: labelData.id,
          name: category.label,
          color: category.color,
          enabled: true,
          isCustom: false
        }
        createdCount++
      } else {
        const errorText = await createLabelResponse.text()
        console.error(`[LABELS] Failed to create label ${category.label}: ${createLabelResponse.status} - ${errorText}`)
      }
    }
  }
  
  console.log(`[LABELS] Label creation completed: ${createdCount} created, ${existingCount} existing`)
  return { labelMap, labelsToStore }
}

async function fetchRecentEmails(accessToken: string, limit: number) {
  console.log(`[FETCH_EMAILS] Fetching ${limit} recent emails...`)
  const messagesResponse = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=${limit}`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  )

  if (!messagesResponse.ok) {
    const errorText = await messagesResponse.text()
    console.error(`[FETCH_EMAILS] Failed to fetch messages: ${messagesResponse.status} - ${errorText}`)
    throw new Error(`Failed to fetch messages: ${messagesResponse.status}`)
  }

  const messagesData: { messages?: GmailMessage[] } = await messagesResponse.json()
  if (!messagesData.messages?.length) {
    console.log(`[FETCH_EMAILS] No messages found`)
    return []
  }
  console.log(`[FETCH_EMAILS] Found ${messagesData.messages.length} message IDs`)

  const emailDetails = await Promise.all(
    messagesData.messages.map(async (message) => {
      const detailResponse = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      )

      if (!detailResponse.ok) {
        console.warn(`[FETCH_EMAILS] Failed to fetch detail for message ${message.id}: ${detailResponse.status}`)
        return null
      }

      const detail: GmailMessageDetail = await detailResponse.json()
      const headers = detail.payload.headers
      const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || 'Unknown'
      const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '(No Subject)'

      return {
        id: detail.id,
        threadId: detail.threadId,
        from,
        subject,
        snippet: detail.snippet
      }
    })
  )

  const validEmails = emailDetails.filter(email => email !== null)
  console.log(`[FETCH_EMAILS] Successfully fetched ${validEmails.length} email details`)
  return validEmails
}

async function fetchEmailDetail(accessToken: string, emailId: string) {
  const detailResponse = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages/${emailId}?format=metadata`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  )

  if (!detailResponse.ok) return null

  const detail: GmailMessageDetail = await detailResponse.json()
  const headers = detail.payload.headers
  const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || 'Unknown'
  const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '(No Subject)'

  return {
    id: detail.id,
    threadId: detail.threadId,
    from,
    subject,
    snippet: detail.snippet
  }
}

async function categorizeSingleEmailWithAI(email: any): Promise<EmailCategory> {
  console.log(`[AI_CATEGORIZE_SINGLE] Categorizing email: ${email.subject}`)
  
  const emailText = `Email:
ID: ${email.id}
From: ${email.from}
Subject: ${email.subject}
Preview: ${email.snippet}`

  const categoryDescriptions = Object.entries(EMAIL_CATEGORIES)
    .map(([key, value]) => `${key}: ${value.description}`)
    .join('\n')

  const prompt = `You are an email classification assistant. Categorize this email into ONE of these categories:

${categoryDescriptions}

Analyze this email and respond ONLY with the category name.

Example response: TO_RESPOND

Email to categorize:
${emailText}

Return ONLY the category name, no other text.`

  try {
    console.log(`[AI_CATEGORIZE_SINGLE] Sending request to AI model for email ${email.id}`)
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      prompt,
      temperature: 0.3,
    })

    const category = text.trim() as EmailCategory
    console.log(`[AI_CATEGORIZE_SINGLE] AI response for email ${email.id}: "${text.trim()}"`)
    
    if (Object.keys(EMAIL_CATEGORIES).includes(category)) {
      console.log(`[AI_CATEGORIZE_SINGLE] Valid category: ${category}`)
      return category
    } else {
      console.log(`[AI_CATEGORIZE_SINGLE] Invalid category "${category}", falling back to FYI`)
      return 'FYI'
    }
    
  } catch (error) {
    console.error(`[AI_CATEGORIZE_SINGLE] AI categorization failed for email ${email.id}:`, error)
    return 'FYI'
  }
}

async function applyLabelToEmail(accessToken: string, emailId: string, labelId: string) {
  console.log(`[APPLY_LABEL] Applying label ${labelId} to email ${emailId}`)
  const modifyResponse = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages/${emailId}/modify`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        addLabelIds: [labelId]
      })
    }
  )

  if (!modifyResponse.ok) {
    const errorData = await modifyResponse.text()
    console.error(`[APPLY_LABEL] Failed to apply label to email ${emailId}: ${modifyResponse.status} - ${errorData}`)
    
    // Check for rate limiting
    if (modifyResponse.status === 429) {
      console.warn(`[APPLY_LABEL] Rate limit detected for email ${emailId}, response headers:`, Object.fromEntries(modifyResponse.headers.entries()))
    }
    
    throw new Error(`Failed to apply label: ${errorData}`)
  }
  
  console.log(`[APPLY_LABEL] Successfully applied label ${labelId} to email ${emailId}`)
}

async function categorizeEmailsWithAI(emails: any[]) {
  if (emails.length === 0) {
    console.log(`[AI_CATEGORIZE] No emails to categorize`)
    return {}
  }

  console.log(`[AI_CATEGORIZE] Starting AI categorization for ${emails.length} emails`)
  const emailsText = emails.map((email, idx) => 
    `Email ${idx + 1}:
ID: ${email.id}
From: ${email.from}
Subject: ${email.subject}
Preview: ${email.snippet}
---`
  ).join('\n\n')

  const categoryDescriptions = Object.entries(EMAIL_CATEGORIES)
    .map(([key, value]) => `${key}: ${value.description}`)
    .join('\n')

  const prompt = `You are an email classification assistant. Categorize each email into ONE of these categories:

${categoryDescriptions}

Analyze these emails and respond ONLY with a JSON object mapping email IDs to categories.

Example response format:
{
  "email-id-1": "TO_RESPOND",
  "email-id-2": "MARKETING",
  "email-id-3": "FYI"
}

Emails to categorize:
${emailsText}

Return ONLY the JSON object, no other text.`

  try {
    console.log(`[AI_CATEGORIZE] Sending request to AI model...`)
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      prompt,
      temperature: 0.3,
    })

    let categories: Record<string, EmailCategory> = {}
    
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        categories = JSON.parse(jsonMatch[0])
      } else {
        categories = JSON.parse(text)
      }
      console.log(`[AI_CATEGORIZE] Successfully parsed AI response: ${Object.keys(categories).length} categories`)
    } catch (parseError) {
      console.error(`[AI_CATEGORIZE] Failed to parse AI response:`, parseError)
      console.log(`[AI_CATEGORIZE] AI response text:`, text)
      categories = emails.reduce((acc, email) => {
        acc[email.id] = 'FYI'
        return acc
      }, {} as Record<string, EmailCategory>)
      console.log(`[AI_CATEGORIZE] Fallback: assigned all emails to FYI category`)
    }

    return categories
    
  } catch (error) {
    console.error(`[AI_CATEGORIZE] AI categorization failed:`, error)
    const fallbackCategories = emails.reduce((acc, email) => {
      acc[email.id] = 'FYI'
      return acc
    }, {} as Record<string, EmailCategory>)
    console.log(`[AI_CATEGORIZE] Fallback: assigned all emails to FYI category`)
    return fallbackCategories
  }
}

async function applyLabelsToEmails(accessToken: string, emails: any[], categories: any, labels: any) {
  if (!labels.labelMap || emails.length === 0) {
    console.log(`[APPLY_LABELS] No labels or emails to process`)
    return 0
  }

  console.log(`[APPLY_LABELS] Starting to apply labels to ${Object.keys(categories).length} emails`)
  let successCount = 0
  let errorCount = 0
  let skippedCount = 0
  
  for (const [emailId, category] of Object.entries(categories)) {
    const labelId = labels.labelMap.get(category)
    
    if (!labelId) {
      console.log(`[APPLY_LABELS] Skipping email ${emailId} - no label ID for category: ${category}`)
      skippedCount++
      continue
    }

    try {
      console.log(`[APPLY_LABELS] Applying label ${labelId} (${category}) to email ${emailId}`)
      const modifyResponse = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${emailId}/modify`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            addLabelIds: [labelId]
          })
        }
      )

      if (modifyResponse.ok) {
        successCount++
        console.log(`[APPLY_LABELS] Successfully labeled email ${emailId}`)
      } else {
        const errorText = await modifyResponse.text()
        console.error(`[APPLY_LABELS] Failed to label email ${emailId}: ${modifyResponse.status} - ${errorText}`)
        errorCount++
        
        // Check for rate limiting
        if (modifyResponse.status === 429) {
          console.warn(`[APPLY_LABELS] Rate limit detected, adding longer delay`)
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
      
      // Small delay between each label application to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      console.error(`[APPLY_LABELS] Error labeling email ${emailId}:`, error)
      errorCount++
    }
  }

  console.log(`[APPLY_LABELS] Label application completed: ${successCount} success, ${errorCount} errors, ${skippedCount} skipped`)
  return successCount
}

async function storeLabelMappings(userId: string, labels: any) {
  if (!labels.labelsToStore || Object.keys(labels.labelsToStore).length === 0) return

  await prisma.profile.upsert({
    where: { id: userId },
    create: { id: userId, email: '' },
    update: {}
  })

  await prisma.userSettings.upsert({
    where: { userId },
    create: { userId, labels: labels.labelsToStore },
    update: { labels: labels.labelsToStore }
  })
}

export const POST = verifySignatureAppRouter(handler)