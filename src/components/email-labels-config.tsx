"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { EMAIL_CATEGORIES } from "@/lib/email-categories"
import { Info } from "lucide-react"

interface EmailLabelsConfigProps {
  className?: string
}

export function EmailLabelsConfig({ className }: EmailLabelsConfigProps) {
  const [isEnabled, setIsEnabled] = useState(true)
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(['MARKETING', 'MEETING_UPDATE']) // Default selected categories
  )

  const toggleCategory = (categoryKey: string) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryKey)) {
        newSet.delete(categoryKey)
      } else {
        newSet.add(categoryKey)
      }
      return newSet
    })
  }

  const getCategoryStyle = (categoryKey: string) => {
    const category = EMAIL_CATEGORIES[categoryKey as keyof typeof EMAIL_CATEGORIES]
    const isSelected = selectedCategories.has(categoryKey)
    
    const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
    
    // Color mapping based on the image
    const colorClasses = {
      TO_RESPOND: "bg-orange-500 text-white",
      FYI: "bg-orange-400 text-white", 
      COMMENT: "bg-yellow-400 text-black",
      NOTIFICATION: "bg-green-500 text-white",
      MEETING_UPDATE: "bg-blue-500 text-white",
      AWAITING_REPLY: "bg-purple-500 text-white",
      ACTIONED: "bg-purple-300 text-black",
      MARKETING: "bg-pink-400 text-white"
    }
    
    return `${baseClasses} ${colorClasses[categoryKey as keyof typeof colorClasses] || "bg-gray-500 text-white"}`
  }

  const categoryDescriptions = {
    TO_RESPOND: "Emails you need to respond to",
    FYI: "Emails that don't require your response, but are important",
    COMMENT: "Team chats in tools like Google Docs or Microsoft Office",
    NOTIFICATION: "Automated updates from tools you use",
    MEETING_UPDATE: "Calendar updates from Zoom, Google Meet, etc",
    AWAITING_REPLY: "Emails you're expecting a reply to",
    ACTIONED: "Email threads that have been resolved",
    MARKETING: "Marketing or cold emails"
  }

  return (
    <div className={`w-full max-w-4xl mx-auto ${className}`}>
  
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
            We will organize your emails using the categories below to keep you focused on what's important.
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
        {Object.entries(EMAIL_CATEGORIES).map(([key, category]) => {
          const isSelected = selectedCategories.has(key)
          const description = categoryDescriptions[key as keyof typeof categoryDescriptions]
          
          return (
            <div
              key={key}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleCategory(key)}
                  className="h-5 w-5"
                />
                <div className="flex items-center space-x-3">
                  <span className={getCategoryStyle(key)}>
                    {category.label.split(': ')[1] || category.label}
                  </span>
                  <span className="text-gray-700 text-sm">
                    {description}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
 
    </div>
  )
}
