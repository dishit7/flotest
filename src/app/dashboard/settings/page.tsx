'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  
  // Draft settings
  const [draftLanguage, setDraftLanguage] = useState('professional')
  const [draftTone, setDraftTone] = useState('polite')
  const [customInstructions, setCustomInstructions] = useState('')
  
  // Custom label
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('#4a86e8')
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      const response = await fetch('/api/user/settings')
      if (response.ok) {
        const data = await response.json()
        if (data.settings) {
          setDraftLanguage(data.settings.draftLanguage || 'professional')
          setDraftTone(data.settings.draftTone || 'polite')
          setCustomInstructions(data.settings.customInstructions || '')
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftLanguage,
          draftTone,
          customInstructions,
        })
      })

      if (response.ok) {
        toast.success('Settings saved successfully!')
      } else {
        toast.error('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const createLabel = async () => {
    if (!newLabelName.trim()) {
      toast.error('Please enter a label name')
      return
    }

    try {
      const response = await fetch('/api/gmail/create-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLabelName,
          color: newLabelColor,
        })
      })

      if (response.ok) {
        toast.success('Label created successfully!')
        setNewLabelName('')
        setNewLabelColor('#4a86e8')
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to create label')
      }
    } catch (error) {
      console.error('Error creating label:', error)
      toast.error('Failed to create label')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted p-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-center">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Customize your email automation preferences
          </p>
        </div>

        {/* Draft Customization */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Draft Reply Customization</CardTitle>
            <CardDescription>
              Customize how AI generates draft replies for your emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="language">Draft Language Style</Label>
              <select
                id="language"
                value={draftLanguage}
                onChange={(e) => setDraftLanguage(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="friendly">Friendly</option>
                <option value="formal">Formal</option>
              </select>
              <p className="text-sm text-muted-foreground">
                The overall style of your draft replies
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tone">Draft Tone</Label>
              <select
                id="tone"
                value={draftTone}
                onChange={(e) => setDraftTone(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="polite">Polite</option>
                <option value="enthusiastic">Enthusiastic</option>
                <option value="concise">Concise</option>
                <option value="warm">Warm</option>
              </select>
              <p className="text-sm text-muted-foreground">
                The tone used in your responses
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Custom Instructions</Label>
              <textarea
                id="instructions"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g., Always mention my availability, use British English, avoid emojis..."
                className="w-full p-2 border rounded-md min-h-[100px]"
              />
              <p className="text-sm text-muted-foreground">
                Additional instructions for the AI when generating drafts
              </p>
            </div>

            <Button onClick={saveSettings} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Draft Settings'}
            </Button>
          </CardContent>
        </Card>

        {/* Create Custom Label */}
        <Card>
          <CardHeader>
            <CardTitle>Create Custom Label</CardTitle>
            <CardDescription>
              Create a new Gmail label for organizing your emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="labelName">Label Name</Label>
              <Input
                id="labelName"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="e.g., Important, Follow-up, Personal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="labelColor">Label Color</Label>
              <div className="flex gap-2 items-center">
                <input
                  id="labelColor"
                  type="color"
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="h-10 w-20 rounded border cursor-pointer"
                />
                <Input
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  placeholder="#4a86e8"
                  className="flex-1"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Choose a color for your label
              </p>
            </div>

            <Button onClick={createLabel}>
              Create Label
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

