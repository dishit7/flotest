'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, Moon, Sun, Monitor } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from 'next-themes'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()
  
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
        router.push('/auth')
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground text-base">
          Manage your account preferences and settings
        </p>
      </div>

      <div className="grid gap-6">
        {/* Appearance Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Appearance</CardTitle>
            <CardDescription className="text-base mt-1.5">
              Customize the look and feel of the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label>Theme</Label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  onClick={() => setTheme('light')}
                  className="w-full justify-start"
                >
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  onClick={() => setTheme('dark')}
                  className="w-full justify-start"
                >
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  onClick={() => setTheme('system')}
                  className="w-full justify-start"
                >
                  <Monitor className="mr-2 h-4 w-4" />
                  System
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Choose your preferred theme or use system settings
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Account Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Account Information</CardTitle>
            <CardDescription className="text-base mt-1.5">
              Your Google account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" disabled className="h-11" placeholder="Fetching email..." />
              <p className="text-sm text-muted-foreground">
                This email is connected to your Gmail account
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Draft Preferences - Redirect Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              Draft Preferences
            </CardTitle>
            <CardDescription className="text-base mt-1.5">
              Customize tone, length, and style of AI-generated drafts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="default" size="lg">
              <Link href="/dashboard/drafts">
                Go to Draft Settings
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Email Labels - Redirect Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              Email Categories & Labels
            </CardTitle>
            <CardDescription className="text-base mt-1.5">
              Manage email categorization rules and custom labels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="default" size="lg">
              <Link href="/dashboard/tags">
                Manage Categories
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-xl text-destructive">Danger Zone</CardTitle>
            <CardDescription className="text-base mt-1.5">
              Irreversible actions - proceed with caution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4 py-4 px-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <div className="space-y-1 flex-1">
                <h3 className="font-medium">Disconnect Account</h3>
                <p className="text-sm text-muted-foreground">
                  Remove your Gmail account connection. You&apos;ll lose access to all features.
                </p>
              </div>
              <Button
                variant="destructive"
                size="lg"
                onClick={() => {
                  if (confirm('Are you sure you want to disconnect your account? This action cannot be undone.')) {
                    supabase.auth.signOut().then(() => {
                      router.push('/')
                    })
                  }
                }}
              >
                Disconnect
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

