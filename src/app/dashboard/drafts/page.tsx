'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, Save, X } from 'lucide-react'

interface DraftSettings {
  draftTone: 'professional' | 'friendly' | 'casual' | 'formal' | 'direct';
  draftLength: 'short' | 'medium' | 'long';
  includeGreeting: boolean;
  includeClosing: boolean;
  customInstructions?: string;
  signatureTemplate?: string;
  responseStyle?: 'direct' | 'empathetic' | 'detailed';
  useEmojis?: boolean;
  formalityLevel?: number;
  avoidWords?: string[];
  preferredPhrases?: string[];
}

export default function DraftsSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<DraftSettings>({
    draftTone: 'professional',
    draftLength: 'medium',
    includeGreeting: true,
    includeClosing: true,
    formalityLevel: 3,
    responseStyle: 'detailed',
    useEmojis: false,
    avoidWords: [],
    preferredPhrases: [],
  })

  const [newAvoidWord, setNewAvoidWord] = useState('')
  const [newPreferredPhrase, setNewPreferredPhrase] = useState('')

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/user/draft-settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/user/draft-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        toast.success('Settings saved successfully!')
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = <K extends keyof DraftSettings>(
    key: K,
    value: DraftSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const addAvoidWord = () => {
    if (newAvoidWord.trim() && !settings.avoidWords?.includes(newAvoidWord.trim())) {
      updateSetting('avoidWords', [...(settings.avoidWords || []), newAvoidWord.trim()])
      setNewAvoidWord('')
    }
  }

  const removeAvoidWord = (word: string) => {
    updateSetting('avoidWords', settings.avoidWords?.filter(w => w !== word) || [])
  }

  const addPreferredPhrase = () => {
    if (newPreferredPhrase.trim() && !settings.preferredPhrases?.includes(newPreferredPhrase.trim())) {
      updateSetting('preferredPhrases', [...(settings.preferredPhrases || []), newPreferredPhrase.trim()])
      setNewPreferredPhrase('')
    }
  }

  const removePreferredPhrase = (phrase: string) => {
    updateSetting('preferredPhrases', settings.preferredPhrases?.filter(p => p !== phrase) || [])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Draft Settings</h1>
          <p className="text-muted-foreground">
            Customize how AI generates email draft responses
          </p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="intermediate">Intermediate</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* BASIC TAB */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Settings</CardTitle>
              <CardDescription>
                The most commonly customized options for draft generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Draft Tone */}
              <div className="space-y-2">
                <Label htmlFor="draftTone">Draft Tone</Label>
                <Select
                  value={settings.draftTone}
                  onValueChange={(value) => updateSetting('draftTone', value as DraftSettings['draftTone'])}
                >
                  <SelectTrigger id="draftTone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="direct">Direct</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  The overall tone and style of your drafted responses
                </p>
              </div>

              {/* Draft Length */}
              <div className="space-y-2">
                <Label htmlFor="draftLength">Draft Length</Label>
                <Select
                  value={settings.draftLength}
                  onValueChange={(value) => updateSetting('draftLength', value as DraftSettings['draftLength'])}
                >
                  <SelectTrigger id="draftLength">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (1-2 paragraphs)</SelectItem>
                    <SelectItem value="medium">Medium (2-3 paragraphs)</SelectItem>
                    <SelectItem value="long">Long (3-4 paragraphs)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Target length for generated draft responses
                </p>
              </div>

              {/* Include Greeting */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="includeGreeting">Include Greeting</Label>
                  <p className="text-sm text-muted-foreground">
                    Start emails with a greeting like &quot;Hi&quot; or &quot;Hello&quot;
                  </p>
                </div>
                <Switch
                  id="includeGreeting"
                  checked={settings.includeGreeting}
                  onCheckedChange={(checked) => updateSetting('includeGreeting', checked)}
                />
              </div>

              {/* Include Closing */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="includeClosing">Include Closing</Label>
                  <p className="text-sm text-muted-foreground">
                    End emails with a closing like &quot;Best regards&quot;
                  </p>
                </div>
                <Switch
                  id="includeClosing"
                  checked={settings.includeClosing}
                  onCheckedChange={(checked) => updateSetting('includeClosing', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INTERMEDIATE TAB */}
        <TabsContent value="intermediate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Intermediate Settings</CardTitle>
              <CardDescription>
                Fine-tune your drafts with custom instructions and templates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Custom Instructions */}
              <div className="space-y-2">
                <Label htmlFor="customInstructions">Custom Instructions</Label>
                <Textarea
                  id="customInstructions"
                  placeholder="E.g., Always mention our next meeting, include links to resources, ask follow-up questions..."
                  value={settings.customInstructions || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateSetting('customInstructions', e.target.value)}
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">
                  Additional instructions for the AI to follow when generating drafts
                </p>
              </div>

              {/* Signature Template */}
              <div className="space-y-2">
                <Label htmlFor="signatureTemplate">Signature Template</Label>
                <Textarea
                  id="signatureTemplate"
                  placeholder="Best regards,&#10;John Doe&#10;Software Engineer&#10;john@example.com"
                  value={settings.signatureTemplate || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateSetting('signatureTemplate', e.target.value)}
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">
                  Custom signature to append to your drafts (leave empty for default)
                </p>
              </div>

              {/* Response Style */}
              <div className="space-y-2">
                <Label htmlFor="responseStyle">Response Style</Label>
                <Select
                  value={settings.responseStyle || 'detailed'}
                  onValueChange={(value) => updateSetting('responseStyle', value as DraftSettings['responseStyle'])}
                >
                  <SelectTrigger id="responseStyle">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">Direct (straight to the point)</SelectItem>
                    <SelectItem value="empathetic">Empathetic (warm and understanding)</SelectItem>
                    <SelectItem value="detailed">Detailed (thorough explanations)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  How the AI should approach responding to emails
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ADVANCED TAB */}
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Fine-grained control over draft generation behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Formality Level */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="formalityLevel">Formality Level</Label>
                  <Badge variant="outline">{settings.formalityLevel || 3}</Badge>
                </div>
                <input
                  type="range"
                  id="formalityLevel"
                  min="1"
                  max="5"
                  step="1"
                  value={settings.formalityLevel || 3}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetting('formalityLevel', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Very Casual</span>
                  <span>Neutral</span>
                  <span>Very Formal</span>
                </div>
              </div>

              {/* Use Emojis */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="useEmojis">Use Emojis</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow the AI to use emojis in draft responses
                  </p>
                </div>
                <Switch
                  id="useEmojis"
                  checked={settings.useEmojis || false}
                  onCheckedChange={(checked) => updateSetting('useEmojis', checked)}
                />
              </div>

              {/* Avoid Words */}
              <div className="space-y-2">
                <Label>Words to Avoid</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter a word or phrase..."
                    value={newAvoidWord}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAvoidWord(e.target.value)}
                    onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && addAvoidWord()}
                  />
                  <Button onClick={addAvoidWord} variant="outline" size="sm">
                    Add
                  </Button>
                </div>
                {settings.avoidWords && settings.avoidWords.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {settings.avoidWords.map((word) => (
                      <Badge key={word} variant="secondary" className="gap-1">
                        {word}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeAvoidWord(word)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  Words or phrases the AI should avoid using
                </p>
              </div>

              {/* Preferred Phrases */}
              <div className="space-y-2">
                <Label>Preferred Phrases</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter a phrase..."
                    value={newPreferredPhrase}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPreferredPhrase(e.target.value)}
                    onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && addPreferredPhrase()}
                  />
                  <Button onClick={addPreferredPhrase} variant="outline" size="sm">
                    Add
                  </Button>
                </div>
                {settings.preferredPhrases && settings.preferredPhrases.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {settings.preferredPhrases.map((phrase) => (
                      <Badge key={phrase} variant="secondary" className="gap-1">
                        {phrase}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removePreferredPhrase(phrase)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  Phrases you&apos;d like the AI to use when appropriate
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save button at bottom */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save All Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

