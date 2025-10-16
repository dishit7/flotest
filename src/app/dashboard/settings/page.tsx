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
     
    </div>
  )
}

