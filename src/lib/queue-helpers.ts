import { qstashClient } from '@/lib/queue'

 
export enum QueueJobType {
  CATEGORIZE_EMAIL = 'CATEGORIZE_EMAIL',
  SIGNUP_INITIALIZATION = 'SIGNUP_INITIALIZATION'
}

export interface CategorizeEmailJob {
  type: QueueJobType.CATEGORIZE_EMAIL
  userId: string
  emailId: string
  accessToken: string
}

export interface SignupInitializationJob {
  type: QueueJobType.SIGNUP_INITIALIZATION
  userId: string
  accessToken: string
  refreshToken?: string
  userEmail: string
}

async function enqueueJob(job: CategorizeEmailJob | SignupInitializationJob, options?: { delay?: number; retries?: number }) {
  if (!qstashClient) {
    console.warn('[QUEUE] Qstash client not initialized - skipping job enqueue')
    throw new Error('QSTASH_TOKEN not configured - queue functionality disabled')
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL must be set for queue workers')
  }

  const workerUrl = `${baseUrl}/api/queue/worker`

  try {
    console.log(`[QUEUE] Enqueueing ${job.type} job for user ${job.userId}${options?.delay ? ` with ${options.delay}ms delay` : ''}`)
    const result = await qstashClient.publishJSON({
      url: workerUrl,
      body: job,
      delay: options?.delay,
      retries: options?.retries || 3,
    })

    console.log(`[QUEUE] Successfully enqueued ${job.type} job for user ${job.userId} with ID: ${result.messageId}`)
    return result
  } catch (error) {
    console.error(`[QUEUE] Failed to enqueue ${job.type} job for user ${job.userId}:`, error)
    throw error
  }
}

async function enqueueBatch(jobs: (CategorizeEmailJob | SignupInitializationJob)[]) {
  if (!qstashClient) {
    console.warn('[QUEUE] Qstash client not initialized - skipping batch enqueue')
    throw new Error('QSTASH_TOKEN not configured - queue functionality disabled')
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL must be set for queue workers')
  }

  const workerUrl = `${baseUrl}/api/queue/worker`

  try {
    console.log(`[QUEUE] Enqueueing batch of ${jobs.length} jobs`)
    const results = await Promise.all(
      jobs.map(job => qstashClient!.publishJSON({
        url: workerUrl,
        body: job,
        retries: 3,
      }))
    )

    console.log(`[QUEUE] Successfully enqueued ${jobs.length} jobs (${results.length} results)`)
    return results
  } catch (error) {
    console.error('[QUEUE] Failed to enqueue batch jobs:', error)
    throw error
  }
}
 



 
export async function enqueueCategorization(
  userId: string,
  accessToken: string,
  emailIds: string[]
) {
  console.log(`[CATEGORIZATION] Creating ${emailIds.length} categorization jobs for user ${userId}`)
  const jobs: CategorizeEmailJob[] = emailIds.map(emailId => ({
    type: QueueJobType.CATEGORIZE_EMAIL,
    userId,
    emailId,
    accessToken
  }))

  console.log(`[CATEGORIZATION] Enqueueing categorization jobs for emails: ${emailIds.slice(0, 5).join(', ')}${emailIds.length > 5 ? '...' : ''}`)
  return enqueueBatch(jobs)
}

export async function enqueueSignupInitialization(
  userId: string,
  accessToken: string,
  refreshToken: string | undefined,
  userEmail: string
) {
  const job: SignupInitializationJob = {
    type: QueueJobType.SIGNUP_INITIALIZATION,
    userId,
    accessToken,
    refreshToken,
    userEmail
  }

  return enqueueJob(job)
}

