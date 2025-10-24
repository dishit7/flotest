import { Client } from '@upstash/qstash'

let qstashClient: Client | null = null

if (process.env.QSTASH_TOKEN) {
  qstashClient = new Client({
    token: process.env.QSTASH_TOKEN,
  })
  console.log('[QUEUE] Qstash client initialized')
} else {
  console.warn('[QUEUE] QSTASH_TOKEN not found - queue disabled')
}

export { qstashClient }