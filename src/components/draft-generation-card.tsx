'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, Sparkles, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface DraftGenerationCardProps {
  onDraftsGenerated?: () => void
}

export function DraftGenerationCard({ onDraftsGenerated }: DraftGenerationCardProps) {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [toRespondCount, setToRespondCount] = useState(0)
  const [alreadyHasDrafts, setAlreadyHasDrafts] = useState(0)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchEmailCounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchEmailCounts = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Fetch emails with TO_RESPOND label
      const response = await fetch('/api/gmail/messages?maxResults=100')
      if (!response.ok) throw new Error('Failed to fetch emails')

      const data = await response.json()
      const emails = data.emails || []

      // Count emails that have TO_RESPOND in their labels
      const toRespond = emails.filter((email: { labels?: string[] }) => 
        email.labels?.some((label: string) => label.includes('to respond') || label.includes('1:'))
      )

      setToRespondCount(toRespond.length)
      
      // TODO: Check database for which emails already have drafts
      // For now, we'll set this to 0
      setAlreadyHasDrafts(0)
    } catch (error) {
      console.error('Error fetching email counts:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateDrafts = async () => {
    try {
      setGenerating(true)
      setProgress({ current: 0, total: toRespondCount })

      // Fetch TO_RESPOND emails
      const response = await fetch('/api/gmail/messages?maxResults=100')
      if (!response.ok) throw new Error('Failed to fetch emails')

      const data = await response.json()
      const emails = data.emails || []

      const toRespondEmails = emails.filter((email: { labels?: string[] }) => 
        email.labels?.some((label: string) => label.includes('to respond') || label.includes('1:'))
      )

      if (toRespondEmails.length === 0) {
        toast.info('No emails need responses')
        return
      }

      // Categorize and generate drafts
      const categorizeResponse = await fetch('/api/categorize-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: toRespondEmails.map((e: { id: string; from: string; subject: string; snippet: string; body: string }) => ({
            id: e.id,
            from: e.from,
            subject: e.subject,
            snippet: e.snippet,
            body: e.body,
          }))
        })
      })

      if (!categorizeResponse.ok) {
        throw new Error('Failed to generate drafts')
      }

      const { drafts } = await categorizeResponse.json()

      if (!drafts || Object.keys(drafts).length === 0) {
        toast.info('No drafts were generated')
        return
      }

      // Create Gmail drafts
      let successCount = 0
      const total = Object.keys(drafts).length

      for (const [emailId, draftBody] of Object.entries(drafts)) {
        const email = toRespondEmails.find((e: { id: string }) => e.id === emailId)
        if (!email || !draftBody) continue

        try {
          const response = await fetch('/api/gmail/create-draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: extractEmailAddress(email.from),
              subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
              body: draftBody as string,
              threadId: email.threadId,
            })
          })

          if (response.ok) {
            successCount++
            setProgress({ current: successCount, total })
          }
        } catch (error) {
          console.error(`Error creating draft for ${emailId}:`, error)
        }
      }

      toast.success('Drafts generated!', {
        description: `Created ${successCount} draft reply${successCount > 1 ? 's' : ''} in Gmail`
      })

      // Refresh counts
      await fetchEmailCounts()
      onDraftsGenerated?.()

    } catch (error) {
      console.error('Error generating drafts:', error)
      toast.error('Failed to generate drafts', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setGenerating(false)
      setProgress(null)
    }
  }

  const extractEmailAddress = (from: string) => {
    const match = from.match(/<(.+?)>/)
    return match ? match[1] : from
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading email stats...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (toRespondCount === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-sm text-muted-foreground">No emails need responses right now</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Emails Need Your Response</CardTitle>
              <CardDescription className="mt-1">
                You have <Badge variant="default" className="mx-1">{toRespondCount}</Badge> 
                email{toRespondCount > 1 ? 's' : ''} waiting for a reply
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {alreadyHasDrafts > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>{alreadyHasDrafts} already have draft replies</span>
            </div>
          )}

          {generating && progress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Generating drafts...</span>
                <span className="font-medium">{progress.current} / {progress.total}</span>
              </div>
              <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <Button
            onClick={generateDrafts}
            disabled={generating}
            className="w-full sm:w-auto"
            size="lg"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Drafts...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate AI Draft Replies
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            AI will analyze each email and create personalized draft responses in your Gmail Drafts folder
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

