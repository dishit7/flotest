'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Mail, RefreshCw, AlertCircle, Inbox, Send } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

type EmailCategory = 'IMPORTANT' | 'OPPORTUNITY' | 'SALES' | 'PERSONAL' | 'INFORMATIONAL' | 'SPAM'

interface Email {
  id: string
  threadId: string
  from: string
  subject: string
  snippet: string
  body: {
    html: string
    text: string
  }
  date: string
  isUnread: boolean
  labels: string[]
  sizeEstimate: number
  aiCategory?: EmailCategory
}

const CATEGORY_CONFIG = {
  IMPORTANT: { label: 'Important', variant: 'destructive' as const },
  OPPORTUNITY: { label: 'New Opportunity', variant: 'default' as const },
  SALES: { label: 'Sales & Marketing', variant: 'secondary' as const },
  PERSONAL: { label: 'Personal', variant: 'outline' as const },
  INFORMATIONAL: { label: 'Informational', variant: 'secondary' as const },
  SPAM: { label: 'Low Priority', variant: 'outline' as const },
}

export default function EmailListPage() {
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [categorizing, setCategorizing] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<EmailCategory | 'ALL'>('ALL')
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const categorizeEmails = async (emailsToCategor: Email[]) => {
    try {
      setCategorizing(true)
      const response = await fetch('/api/categorize-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: emailsToCategor.map(e => ({
            id: e.id,
            from: e.from,
            subject: e.subject,
            snippet: e.snippet,
          }))
        })
      })

      if (!response.ok) {
        console.error('Failed to categorize emails')
        return emailsToCategor
      }

      const { categories } = await response.json()
      return emailsToCategor.map(email => ({
        ...email,
        aiCategory: categories[email.id] || 'INFORMATIONAL'
      }))
    } catch (err) {
      console.error('Error categorizing emails:', err)
      return emailsToCategor
    } finally {
      setCategorizing(false)
    }
  }

  const fetchEmails = async () => {
    try {
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/signin')
        return
      }

      const response = await fetch('/api/gmail/messages?maxResults=20')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch emails')
      }

      const data = await response.json()
      let fetchedEmails = data.emails || []
      
      if (fetchedEmails.length > 0) {
        fetchedEmails = await categorizeEmails(fetchedEmails)
      }
      
      setEmails(fetchedEmails)
    } catch (err) {
      console.error('Error fetching emails:', err)
      setError(err instanceof Error ? err.message : 'Failed to load emails')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchEmails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchEmails()
  }

  const handleSendReply = async () => {
    if (!selectedEmail || !replyText.trim()) return

    try {
      setSendingReply(true)
      const response = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: extractEmailAddress(selectedEmail.from),
          subject: selectedEmail.subject.startsWith('Re:') 
            ? selectedEmail.subject 
            : `Re: ${selectedEmail.subject}`,
          body: replyText,
          threadId: selectedEmail.threadId,
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send reply')
      }

      setReplyText('')
      toast.success('Reply sent successfully!', {
        description: `Sent to ${extractEmailAddress(selectedEmail.from)}`
      })
      setSelectedEmail(null)
    } catch (err) {
      console.error('Error sending reply:', err)
      toast.error('Failed to send reply', {
        description: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setSendingReply(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffHours / 24)

      if (diffHours < 1) {
        const diffMins = Math.floor(diffMs / (1000 * 60))
        return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
      } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
      } else {
        return date.toLocaleDateString()
      }
    } catch {
      return dateString
    }
  }

  const extractEmailAddress = (from: string) => {
    const match = from.match(/<(.+?)>/)
    return match ? match[1] : from
  }

  const extractSenderName = (from: string) => {
    const match = from.match(/^"?(.+?)"?\s*</)
    if (match) return match[1].replace(/"/g, '')
    return from.split('<')[0].trim() || extractEmailAddress(from)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Gmail Inbox</h1>
              <p className="text-muted-foreground">
                {categorizing ? 'AI is categorizing your emails...' : 'View and manage your Gmail messages'}
              </p>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={refreshing || categorizing}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 mt-4 flex-wrap">
            <Badge
              variant={selectedCategory === 'ALL' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedCategory('ALL')}
            >
              All ({emails.length})
            </Badge>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              const count = emails.filter(e => e.aiCategory === key).length
              if (count === 0) return null
              return (
                <Badge
                  key={key}
                  variant={selectedCategory === key ? config.variant : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory(key as EmailCategory)}
                >
                  {config.label} ({count})
                </Badge>
              )
            })}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-destructive mb-1">Error Loading Emails</h3>
                  <p className="text-sm text-muted-foreground">{error}</p>
                  {error.includes('provider tokens') && (
                    <div className="mt-3 p-3 bg-muted rounded-md text-sm">
                      <p className="font-medium mb-2">📝 Setup Required:</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Go to your Supabase Dashboard</li>
                        <li>Navigate to Authentication → Settings</li>
                        <li>Enable &quot;Return provider tokens&quot;</li>
                        <li>Sign out and sign in again with Google</li>
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Email List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Inbox className="h-5 w-5" />
                <CardTitle>Recent Messages</CardTitle>
              </div>
              {emails.length > 0 && (
                <Badge variant="secondary">{emails.length} messages</Badge>
              )}
            </div>
            <CardDescription>
              Showing your most recent Gmail messages
            </CardDescription>
          </CardHeader>
          <CardContent>
            {emails.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No messages found</h3>
                <p className="text-muted-foreground">
                  Your inbox appears to be empty or we couldn&apos;t fetch your messages.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {emails
                  .filter(email => selectedCategory === 'ALL' || email.aiCategory === selectedCategory)
                  .map((email) => (
                  <div
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className={`py-4 hover:bg-muted/50 transition-colors cursor-pointer rounded-lg px-3 -mx-3 ${
                      email.isUnread ? 'bg-muted/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {extractSenderName(email.from).charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Email Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`font-semibold truncate ${email.isUnread ? 'text-foreground' : 'text-foreground/80'}`}>
                              {extractSenderName(email.from)}
                            </p>
                            {email.isUnread && (
                              <Badge variant="default" className="h-5 px-2 text-xs">
                                New
                              </Badge>
                            )}
                            {email.aiCategory && CATEGORY_CONFIG[email.aiCategory] && (
                              <Badge 
                                variant={CATEGORY_CONFIG[email.aiCategory].variant}
                                className="h-5 px-2 text-xs"
                              >
                                {CATEGORY_CONFIG[email.aiCategory].label}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(email.date)}
                          </span>
                        </div>
                        
                        <p className={`text-sm mb-1 truncate ${email.isUnread ? 'font-medium' : 'text-muted-foreground'}`}>
                          {email.subject}
                        </p>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {email.snippet}
                        </p>

                        {/* Labels */}
                        {email.labels.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {email.labels
                              .filter(label => !['UNREAD', 'CATEGORY_PERSONAL', 'INBOX', 'IMPORTANT'].includes(label))
                              .slice(0, 3)
                              .map((label) => (
                                <Badge key={label} variant="outline" className="text-xs">
                                  {label.toLowerCase().replace('_', ' ')}
                                </Badge>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Detail Sheet */}
        <Sheet open={!!selectedEmail} onOpenChange={(open) => !open && setSelectedEmail(null)}>
          <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
            {selectedEmail && (
              <>
                <SheetHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <SheetTitle className="text-xl mb-2">{selectedEmail.subject}</SheetTitle>
                      <SheetDescription>
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="font-medium">From:</span> {extractSenderName(selectedEmail.from)}
                            <span className="text-muted-foreground ml-2">
                              &lt;{extractEmailAddress(selectedEmail.from)}&gt;
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Date:</span> {formatDate(selectedEmail.date)}
                          </div>
                        </div>
                      </SheetDescription>
                    </div>
                    {selectedEmail.isUnread && (
                      <Badge variant="default">New</Badge>
                    )}
                  </div>
                </SheetHeader>

                <div className="mt-6">
                  {/* Email Body */}
                  <div className="prose prose-sm max-w-none">
                    {selectedEmail.body.html ? (
                      <div 
                        className="email-body"
                        dangerouslySetInnerHTML={{ __html: selectedEmail.body.html }}
                      />
                    ) : selectedEmail.body.text ? (
                      <pre className="whitespace-pre-wrap font-sans text-sm">
                        {selectedEmail.body.text}
                      </pre>
                    ) : (
                      <p className="text-muted-foreground italic">
                        No email body content available.
                      </p>
                    )}
                  </div>

                  {/* Email metadata */}
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex gap-2 flex-wrap">
                      {selectedEmail.labels
                        .filter(label => !['UNREAD', 'CATEGORY_PERSONAL', 'INBOX', 'IMPORTANT'].includes(label))
                        .map((label) => (
                          <Badge key={label} variant="outline" className="text-xs">
                            {label.toLowerCase().replace('_', ' ')}
                          </Badge>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      Email size: {(selectedEmail.sizeEstimate / 1024).toFixed(2)} KB
                    </p>
                  </div>

                  {/* Reply Section */}
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-semibold mb-3">Send Reply</h3>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type your reply here..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleSendReply()
                            }
                          }}
                          disabled={sendingReply}
                          className="flex-1"
                        />
                        <Button
                          onClick={handleSendReply}
                          disabled={!replyText.trim() || sendingReply}
                          size="icon"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Press Enter to send &bull; To: {extractEmailAddress(selectedEmail.from)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}

