"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, Mail, Sparkles, Tags, Settings } from "lucide-react"
import Link from "next/link"

export default function Page() {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerateDrafts = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/gmail/generate-drafts-for-category', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category: 'TO_RESPOND' })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`Successfully generated ${data.draftsCreated} draft(s)!`)
      } else {
        toast.error(data.error || 'Failed to generate drafts')
      }
    } catch (error) {
      toast.error('Failed to generate drafts')
      console.error('Error generating drafts:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Welcome to Flobase</h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Your AI-powered email management hub. Automatically categorize emails, generate smart drafts, and stay organized with custom labels.
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Generate Drafts</CardTitle>
            </div>
            <CardDescription className="mt-3">
              AI will create personalized draft responses for emails in your TO_RESPOND category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleGenerateDrafts}
              disabled={isGenerating}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Drafts
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Tags className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Manage Categories</CardTitle>
            </div>
            <CardDescription className="mt-3">
              Customize email categories, create custom labels, and set categorization rules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link href="/dashboard/tags">
                <Tags className="mr-2 h-5 w-5" />
                Manage Labels
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Draft Settings</CardTitle>
            </div>
            <CardDescription className="mt-3">
              Customize tone, length, and style of AI-generated draft responses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-5 w-5" />
                Configure Settings
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                  1
                </div>
                Categorize
              </div>
              <p className="text-sm text-muted-foreground">
                AI automatically sorts your emails into smart categories like TO_RESPOND, FYI, and more
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                  2
                </div>
                Generate
              </div>
              <p className="text-sm text-muted-foreground">
                Click generate to create intelligent draft responses tailored to each email
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                  3
                </div>
                Review & Send
              </div>
              <p className="text-sm text-muted-foreground">
                Review drafts in Gmail, make any edits, and send when ready
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
