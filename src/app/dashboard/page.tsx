"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, Mail } from "lucide-react"

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
    <div className="flex flex-1 flex-col items-center justify-center">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">Welcome to Flobase</h1>
        <p className="text-lg text-muted-foreground">
          We have categorized your mails. You can create your custom labels and generate drafts automatically and customize tone and all for your drafts.
        </p>
        <div className="pt-4">
          <Button 
            onClick={handleGenerateDrafts}
            disabled={isGenerating}
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating Drafts...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-5 w-5" />
                Generate Drafts for TO_RESPOND
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
