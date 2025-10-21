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
      if (!session) {
        console.log('No session found')
        return
      }

      // First, get all labels to find the "to respond" label ID
      const labelsResponse = await fetch('/api/gmail/labels')
      if (!labelsResponse.ok) {
        throw new Error('Failed to fetch labels')
      }
      
      const labelsData = await labelsResponse.json()
      const toRespondLabel = labelsData.toRespondLabel
      
      if (!toRespondLabel) {
        console.log('No "to respond" label found')
        setToRespondCount(0)
        return
      }
      
      console.log('Found "to respond" label:', toRespondLabel.name, 'ID:', toRespondLabel.id)

       
      const response = await fetch('/api/gmail/messages?maxResults=100')
      if (!response.ok) {
        throw new Error('Failed to fetch emails')
      }

      const data = await response.json()
      const emails = data.emails || []

      // Count emails that have the "to respond" label ID
      const toRespond = emails.filter((email: { labels?: string[] }) => {
        const labels = email.labels || []
        return labels.includes(toRespondLabel.id)
      })

      console.log(`Found ${toRespond.length} emails with "to respond" label`)
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

  // Always show the welcome message and categories, even when no emails need responses

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10 mt-1">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <CardTitle className="text-2xl">Welcome to Flobase!</CardTitle>
                <CardDescription className="mt-2 text-base">
                  We&apos;ve analyzed your emails and created <strong>8 smart categories</strong> to help you stay organized:
                </CardDescription>
              </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500 dark:bg-red-600"></div>
                    <span className="text-foreground">1: To Respond</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-orange-400 dark:bg-orange-500"></div>
                    <span className="text-foreground">2: FYI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-yellow-400 dark:bg-yellow-500"></div>
                    <span className="text-foreground">3: Comment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500 dark:bg-green-600"></div>
                    <span className="text-foreground">4: Notification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500 dark:bg-blue-600"></div>
                    <span className="text-foreground">5: Meeting Update</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-purple-500 dark:bg-purple-600"></div>
                    <span className="text-foreground">6: Awaiting Reply</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-indigo-400 dark:bg-indigo-500"></div>
                    <span className="text-foreground">7: Actioned</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-gray-400 dark:bg-gray-500"></div>
                    <span className="text-foreground">8: Marketing</span>
                  </div>
                </div>
                {toRespondCount > 0 && (
                  <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                    <p className="text-orange-800 dark:text-orange-200 font-medium text-sm">
                      You have <Badge variant="destructive" className="mx-1">{toRespondCount}</Badge> 
                      email{toRespondCount > 1 ? 's' : ''} in your &quot;To Respond&quot; category that need your attention
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
          {alreadyHasDrafts > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" />
              <span className="text-muted-foreground">{alreadyHasDrafts} already have draft replies</span>
            </div>
          )}

          {generating && progress && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Generating drafts...</span>
                <span className="font-medium text-foreground">{progress.current} / {progress.total}</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button
              onClick={generateDrafts}
              disabled={generating || toRespondCount === 0}
              className="w-full"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Drafts...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Automatic Drafts
                </>
              )}
            </Button>

            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              {toRespondCount > 0 
                ? `AI will analyze ${toRespondCount} email${toRespondCount > 1 ? 's' : ''} and create personalized draft responses in your Gmail Drafts folder`
                : "No emails need responses right now - you're all caught up!"
              }
            </p>
          </div>
      </CardContent>
    </Card>
  )
}

