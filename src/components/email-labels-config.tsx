"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Info, Loader2, Plus, Settings2, X, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface EmailLabelsConfigProps {
  className?: string
}

interface Label {
  id: string
  name: string
  color: string
  enabled: boolean
  isCustom: boolean
}

interface CustomizationRules {
  includeSenders?: string[]
  excludeSenders?: string[]
  includeDomains?: string[]
  includeSubjectKeywords?: string[]
  excludeSubjectKeywords?: string[]
  customInstructions?: string
}

export function EmailLabelsConfig({ className }: EmailLabelsConfigProps) {
  const [loading, setLoading] = useState(true)
  const [labels, setLabels] = useState<Record<string, Label>>({})
  const [customization, setCustomization] = useState<Record<string, CustomizationRules>>({})
  const [isEnabled, setIsEnabled] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('blue')
  
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false)
  const [customizing, setCustomizing] = useState(false)
  const [selectedLabelKey, setSelectedLabelKey] = useState<string | null>(null)
  const [tempRules, setTempRules] = useState<CustomizationRules>({})
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [labelToDelete, setLabelToDelete] = useState<string | null>(null)

  const colorOptions = [
    { name: 'Red', value: 'red', hex: '#fb4c2f' },
    { name: 'Orange', value: 'orange', hex: '#f691b2' },
    { name: 'Yellow', value: 'yellow', hex: '#fad165' },
    { name: 'Green', value: 'green', hex: '#16a765' },
    { name: 'Blue', value: 'blue', hex: '#4a86e8' },
    { name: 'Purple', value: 'purple', hex: '#a479e2' },
    { name: 'Gray', value: 'gray', hex: '#cca6ac' },
    { name: 'Pink', value: 'pink', hex: '#ff7537' },
    { name: 'Teal', value: 'teal', hex: '#42d692' },
    { name: 'Brown', value: 'brown', hex: '#8d6e63' }
  ]

  useEffect(() => {
    fetchLabels()
  }, [])

  const fetchLabels = async () => {
    try {
      const response = await fetch('/api/labels')
      if (response.ok) {
        const data = await response.json()
        setLabels(data.labels || {})
        setCustomization(data.customization || {})
      } else {
        toast.error('Failed to load labels')
      }
    } catch (error) {
      console.error('Error fetching labels:', error)
      toast.error('Failed to load labels')
    } finally {
      setLoading(false)
    }
  }

  const toggleCategory = async (labelKey: string) => {
    const currentEnabled = labels[labelKey]?.enabled
    const newEnabled = !currentEnabled

    setLabels(prev => ({
      ...prev,
      [labelKey]: { ...prev[labelKey], enabled: newEnabled }
    }))

    try {
      const response = await fetch('/api/labels/toggle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labelKey, enabled: newEnabled })
      })

      if (response.ok) {
        toast.success(`Label ${newEnabled ? 'enabled' : 'disabled'}`)
      } else {
        setLabels(prev => ({
          ...prev,
          [labelKey]: { ...prev[labelKey], enabled: currentEnabled }
        }))
        toast.error('Failed to update label')
      }
    } catch {
      setLabels(prev => ({
        ...prev,
        [labelKey]: { ...prev[labelKey], enabled: currentEnabled }
      }))
      toast.error('Failed to update label')
    }
  }

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) {
      toast.error('Label name is required')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/labels/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newLabelName.trim(), 
          color: newLabelColor 
        })
      })

      if (response.ok) {
        const data = await response.json()
        setLabels(prev => ({
          ...prev,
          [data.label.key]: data.label
        }))
        toast.success('Custom label created successfully!')
        setIsCreateModalOpen(false)
        setNewLabelName('')
        setNewLabelColor('blue')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to create label')
      }
    } catch {
      toast.error('Failed to create label')
    } finally {
      setCreating(false)
    }
  }

  const openCustomizeModal = (labelKey: string) => {
    setSelectedLabelKey(labelKey)
    setTempRules(customization[labelKey] || {})
    setIsCustomizeModalOpen(true)
  }

  const handleSaveCustomization = async () => {
    if (!selectedLabelKey) return

    setCustomizing(true)
    try {
      const response = await fetch('/api/labels/customize', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          labelKey: selectedLabelKey, 
          rules: tempRules 
        })
      })

      if (response.ok) {
        setCustomization(prev => ({
          ...prev,
          [selectedLabelKey]: tempRules
        }))
        toast.success('Customization saved successfully!')
        setIsCustomizeModalOpen(false)
        setSelectedLabelKey(null)
        setTempRules({})
      } else {
        toast.error('Failed to save customization')
      }
    } catch {
      toast.error('Failed to save customization')
    } finally {
      setCustomizing(false)
    }
  }

  const addToArray = (field: keyof CustomizationRules, value: string) => {
    if (!value.trim()) return
    const currentArray = (tempRules[field] as string[]) || []
    if (!currentArray.includes(value.trim())) {
      setTempRules(prev => ({
        ...prev,
        [field]: [...currentArray, value.trim()]
      }))
    }
  }

  const removeFromArray = (field: keyof CustomizationRules, value: string) => {
    const currentArray = (tempRules[field] as string[]) || []
    setTempRules(prev => ({
      ...prev,
      [field]: currentArray.filter(item => item !== value)
    }))
  }

  const openDeleteModal = (labelKey: string) => {
    setLabelToDelete(labelKey)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteLabel = async () => {
    if (!labelToDelete) return

    setDeleting(true)
    try {
      const response = await fetch('/api/labels/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labelKey: labelToDelete })
      })

      if (response.ok) {
        setLabels(prev => {
          const newLabels = { ...prev }
          delete newLabels[labelToDelete]
          return newLabels
        })
        setCustomization(prev => {
          const newCustomization = { ...prev }
          delete newCustomization[labelToDelete]
          return newCustomization
        })
        toast.success('Label deleted successfully!')
        setIsDeleteModalOpen(false)
        setLabelToDelete(null)
      } else {
        toast.error('Failed to delete label')
      }
    } catch {
      toast.error('Failed to delete label')
    } finally {
      setDeleting(false)
    }
  }

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      'red': 'bg-orange-500 text-white',
      'orange': 'bg-orange-400 text-white',
      'yellow': 'bg-yellow-400 text-black',
      'green': 'bg-green-500 text-white',
      'blue': 'bg-blue-500 text-white',
      'purple': 'bg-purple-500 text-white',
      'gray': 'bg-pink-400 text-white'
    }
    return `inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colorMap[color] || 'bg-gray-500 text-white'}`
  }

  const categoryDescriptions: Record<string, string> = {
    TO_RESPOND: "Emails you need to respond to",
    FYI: "Emails that don't require your response, but are important",
    COMMENT: "Team chats in tools like Google Docs or Microsoft Office",
    NOTIFICATION: "Automated updates from tools you use",
    MEETING_UPDATE: "Calendar updates from Zoom, Google Meet, etc",
    AWAITING_REPLY: "Emails you're expecting a reply to",
    ACTIONED: "Email threads that have been resolved",
    MARKETING: "Marketing or cold emails"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className={`w-full max-w-4xl mx-auto ${className}`}>
  
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
            We will organize your emails using the categories below to keep you focused on what&apos;s important.
        </h1>
        <div className="flex items-center space-x-2">
          <Switch
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
            className="data-[state=checked]:bg-blue-600"
          />
        </div>
      </div>

     
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-8">
        <div className="flex items-start space-x-3">
          <Info className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
          <p className="text-gray-700 text-sm">
            Turning on a category below will move emails in that category out of your main inbox and into a folder (in Outlook) or label (in Gmail).
          </p>
        </div>
      </div>

     
      <div className="space-y-4">
        {Object.entries(labels).map(([key, label]) => {
          const description = categoryDescriptions[key] || "Custom label"
          const hasCustomization = customization[key] && Object.keys(customization[key]).length > 0
          
          return (
            <div
              key={key}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <Checkbox
                  checked={label.enabled}
                  onCheckedChange={() => toggleCategory(key)}
                  className="h-5 w-5"
                />
                <div className="flex items-center space-x-3">
                  <span className={getColorClass(label.color)}>
                    {label.name.split(': ')[1] || label.name}
                  </span>
                  <span className="text-gray-700 text-sm">
                    {description}
                  </span>
                  {label.isCustom && (
                    <span className="text-xs text-gray-500 italic">(Custom)</span>
                  )}
                  {hasCustomization && (
                    <span className="text-xs text-blue-600 font-medium">(Customized)</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openCustomizeModal(key)}
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
                {label.isCustom && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDeleteModal(key)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
 
      <div className="mt-6">
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Create Custom Label
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Custom Label</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="labelName">Label Name</Label>
                <Input
                  id="labelName"
                  placeholder="e.g., VIP Clients, Team Updates"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="labelColor">Label Color</Label>
                <div className="grid grid-cols-5 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setNewLabelColor(color.value)}
                      className={`h-10 rounded-md border-2 transition-all ${
                        newLabelColor === color.value
                          ? 'border-gray-900 ring-2 ring-gray-400'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    >
                      <span className="sr-only">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <Button 
                onClick={handleCreateLabel} 
                disabled={creating || !newLabelName.trim()}
                className="w-full"
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Label'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Customize Label Modal */}
      <Dialog open={isCustomizeModalOpen} onOpenChange={setIsCustomizeModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customize Label Rules</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <InputWithTags
              label="Include Senders"
              placeholder="email@example.com"
              values={tempRules.includeSenders || []}
              onAdd={(value) => addToArray('includeSenders', value)}
              onRemove={(value) => removeFromArray('includeSenders', value)}
            />
            
            <InputWithTags
              label="Exclude Senders"
              placeholder="spam@example.com"
              values={tempRules.excludeSenders || []}
              onAdd={(value) => addToArray('excludeSenders', value)}
              onRemove={(value) => removeFromArray('excludeSenders', value)}
            />

            <InputWithTags
              label="Include Domains"
              placeholder="company.com"
              values={tempRules.includeDomains || []}
              onAdd={(value) => addToArray('includeDomains', value)}
              onRemove={(value) => removeFromArray('includeDomains', value)}
            />

            <InputWithTags
              label="Include Subject Keywords"
              placeholder="newsletter, update"
              values={tempRules.includeSubjectKeywords || []}
              onAdd={(value) => addToArray('includeSubjectKeywords', value)}
              onRemove={(value) => removeFromArray('includeSubjectKeywords', value)}
            />

            <InputWithTags
              label="Exclude Subject Keywords"
              placeholder="urgent, spam"
              values={tempRules.excludeSubjectKeywords || []}
              onAdd={(value) => addToArray('excludeSubjectKeywords', value)}
              onRemove={(value) => removeFromArray('excludeSubjectKeywords', value)}
            />

            <div className="space-y-2">
              <Label>Custom AI Instructions</Label>
              <Textarea
                placeholder="Tell AI how to categorize emails for this label..."
                value={tempRules.customInstructions || ''}
                onChange={(e) => setTempRules(prev => ({ ...prev, customInstructions: e.target.value }))}
                rows={4}
              />
            </div>

            <Button 
              onClick={handleSaveCustomization}
              disabled={customizing}
              className="w-full"
            >
              {customizing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Customization'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Label</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this label? This will remove it from Gmail and all your customization settings. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteLabel}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
    </div>
  )
}

function InputWithTags({ 
  label, 
  placeholder, 
  values, 
  onAdd, 
  onRemove 
}: {
  label: string
  placeholder: string
  values: string[]
  onAdd: (value: string) => void
  onRemove: (value: string) => void
}) {
  const [inputValue, setInputValue] = useState('')

  const handleAdd = () => {
    if (inputValue.trim()) {
      onAdd(inputValue)
      setInputValue('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {values.map((value) => (
            <div
              key={value}
              className="flex items-center gap-1 bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm"
            >
              <span>{value}</span>
              <button
                type="button"
                onClick={() => onRemove(value)}
                className="hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
