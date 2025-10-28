'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, X, Edit2, Users, Mail } from 'lucide-react'

export interface ContactContext {
  id: string
  name: string
  email: string
  company?: string
  role?: string
  relationship: 'colleague' | 'client' | 'vendor' | 'friend' | 'family' | 'other'
  communicationStyle: {
    tone: 'formal' | 'casual' | 'mixed'
    length: 'concise' | 'detailed' | 'mixed'
    frequency: 'daily' | 'weekly' | 'monthly' | 'rare'
  }
  preferences: {
    responseTime: 'urgent' | 'normal' | 'flexible'
    topics: string[]
    avoidTopics: string[]
  }
  notes: string
  lastInteraction?: string
}

interface ContactContextManagerProps {
  contacts: ContactContext[]
  onContactsChange: (contacts: ContactContext[]) => void
}

export function ContactContextManager({ contacts, onContactsChange }: ContactContextManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<ContactContext | null>(null)
  const [formData, setFormData] = useState<Partial<ContactContext>>({
    name: '',
    email: '',
    company: '',
    role: '',
    relationship: 'colleague',
    communicationStyle: {
      tone: 'mixed',
      length: 'mixed',
      frequency: 'weekly'
    },
    preferences: {
      responseTime: 'normal',
      topics: [],
      avoidTopics: []
    },
    notes: ''
  })

  const [newTopic, setNewTopic] = useState('')
  const [newAvoidTopic, setNewAvoidTopic] = useState('')

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      company: '',
      role: '',
      relationship: 'colleague',
      communicationStyle: {
        tone: 'mixed',
        length: 'mixed',
        frequency: 'weekly'
      },
      preferences: {
        responseTime: 'normal',
        topics: [],
        avoidTopics: []
      },
      notes: ''
    })
    setNewTopic('')
    setNewAvoidTopic('')
    setEditingContact(null)
  }

  const handleSave = () => {
    if (!formData.name || !formData.email) {
      toast.error('Name and email are required')
      return
    }

    const contact: ContactContext = {
      id: editingContact?.id || `contact-${Date.now()}`,
      name: formData.name!,
      email: formData.email!,
      company: formData.company,
      role: formData.role,
      relationship: formData.relationship!,
      communicationStyle: formData.communicationStyle!,
      preferences: formData.preferences!,
      notes: formData.notes || '',
      lastInteraction: editingContact?.lastInteraction || new Date().toISOString().split('T')[0]
    }

    if (editingContact) {
      // Update existing contact
      const updatedContacts = contacts.map(c => c.id === editingContact.id ? contact : c)
      onContactsChange(updatedContacts)
      toast.success('Contact updated successfully')
    } else {
      // Add new contact
      onContactsChange([...contacts, contact])
      toast.success('Contact added successfully')
    }

    setIsDialogOpen(false)
    resetForm()
  }

  const handleEdit = (contact: ContactContext) => {
    setEditingContact(contact)
    setFormData(contact)
    setIsDialogOpen(true)
  }

  const handleDelete = (contactId: string) => {
    const updatedContacts = contacts.filter(c => c.id !== contactId)
    onContactsChange(updatedContacts)
    toast.success('Contact deleted successfully')
  }

  const addTopic = () => {
    if (newTopic.trim() && !formData.preferences?.topics?.includes(newTopic.trim())) {
      setFormData(prev => ({
        ...prev,
        preferences: {
          ...prev.preferences!,
          topics: [...(prev.preferences?.topics || []), newTopic.trim()]
        }
      }))
      setNewTopic('')
    }
  }

  const removeTopic = (topic: string) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences!,
        topics: prev.preferences?.topics?.filter(t => t !== topic) || []
      }
    }))
  }

  const addAvoidTopic = () => {
    if (newAvoidTopic.trim() && !formData.preferences?.avoidTopics?.includes(newAvoidTopic.trim())) {
      setFormData(prev => ({
        ...prev,
        preferences: {
          ...prev.preferences!,
          avoidTopics: [...(prev.preferences?.avoidTopics || []), newAvoidTopic.trim()]
        }
      }))
      setNewAvoidTopic('')
    }
  }

  const removeAvoidTopic = (topic: string) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences!,
        avoidTopics: prev.preferences?.avoidTopics?.filter(t => t !== topic) || []
      }
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contact Context
          </h3>
          <p className="text-sm text-muted-foreground">
            Add information about your contacts to improve draft personalization
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingContact ? 'Edit Contact' : 'Add New Contact'}
              </DialogTitle>
              <DialogDescription>
                Provide context about this contact to improve AI draft generation
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Acme Corp"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={formData.role || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    placeholder="Software Engineer"
                  />
                </div>
              </div>

              {/* Relationship */}
              <div className="space-y-2">
                <Label htmlFor="relationship">Relationship</Label>
                <Select
                  value={formData.relationship}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, relationship: value as ContactContext['relationship'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="colleague">Colleague</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                    <SelectItem value="friend">Friend</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Communication Style */}
              <div className="space-y-4">
                <h4 className="font-medium">Communication Style</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Tone</Label>
                    <Select
                      value={formData.communicationStyle?.tone}
                      onValueChange={(value) => setFormData(prev => ({
                        ...prev,
                        communicationStyle: { ...prev.communicationStyle!, tone: value as 'formal' | 'casual' | 'mixed' }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Length</Label>
                    <Select
                      value={formData.communicationStyle?.length}
                      onValueChange={(value) => setFormData(prev => ({
                        ...prev,
                        communicationStyle: { ...prev.communicationStyle!, length: value as 'concise' | 'detailed' | 'mixed' }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="concise">Concise</SelectItem>
                        <SelectItem value="detailed">Detailed</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={formData.communicationStyle?.frequency}
                      onValueChange={(value) => setFormData(prev => ({
                        ...prev,
                        communicationStyle: { ...prev.communicationStyle!, frequency: value as 'daily' | 'weekly' | 'monthly' | 'rare' }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="rare">Rare</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="space-y-4">
                <h4 className="font-medium">Preferences</h4>
                <div className="space-y-2">
                  <Label>Response Time</Label>
                  <Select
                    value={formData.preferences?.responseTime}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences!, responseTime: value as 'urgent' | 'normal' | 'flexible' }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="flexible">Flexible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Topics */}
                <div className="space-y-2">
                  <Label>Preferred Topics</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a topic..."
                      value={newTopic}
                      onChange={(e) => setNewTopic(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTopic()}
                    />
                    <Button onClick={addTopic} variant="outline" size="sm">
                      Add
                    </Button>
                  </div>
                  {formData.preferences?.topics && formData.preferences.topics.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.preferences.topics.map((topic) => (
                        <Badge key={topic} variant="secondary" className="gap-1">
                          {topic}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => removeTopic(topic)} />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Avoid Topics */}
                <div className="space-y-2">
                  <Label>Topics to Avoid</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a topic to avoid..."
                      value={newAvoidTopic}
                      onChange={(e) => setNewAvoidTopic(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addAvoidTopic()}
                    />
                    <Button onClick={addAvoidTopic} variant="outline" size="sm">
                      Add
                    </Button>
                  </div>
                  {formData.preferences?.avoidTopics && formData.preferences.avoidTopics.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.preferences.avoidTopics.map((topic) => (
                        <Badge key={topic} variant="destructive" className="gap-1">
                          {topic}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => removeAvoidTopic(topic)} />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional context about this contact..."
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  {editingContact ? 'Update Contact' : 'Add Contact'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contacts List */}
      {contacts.length > 0 ? (
        <div className="grid gap-4">
          {contacts.map((contact) => (
            <Card key={contact.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{contact.name}</h4>
                      <Badge variant="outline">{contact.relationship}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {contact.email}
                    </div>
                    {contact.company && (
                      <p className="text-sm text-muted-foreground">
                        {contact.company} • {contact.role}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {contact.communicationStyle.tone} tone
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {contact.communicationStyle.length} length
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {contact.preferences.responseTime} response
                      </Badge>
                    </div>
                    {contact.notes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {contact.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(contact)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(contact.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No contacts added yet</h3>
            <p className="text-muted-foreground mb-4">
              Add contact information to help the AI generate more personalized drafts
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Contact
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


