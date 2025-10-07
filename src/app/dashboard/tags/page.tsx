"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function TagsPage() {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())

  const tags = [
    { id: "respond", name: "Respond", description: "Emails that need a response", variant: "secondary" as const },
    { id: "fyi", name: "FYI", description: "", variant: "blue" as const },
    { id: "marketing", name: "Marketing", description: "", variant: "default" as const },
    { id: "meeting-update", name: "Meeting Update", description: "", variant: "default" as const },
    { id: "about", name: "About", description: "", variant: "default" as const },
  ]

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev)
      if (newSet.has(tagId)) {
        newSet.delete(tagId)
      } else {
        newSet.add(tagId)
      }
      return newSet
    })
  }
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="p-4 lg:p-6 flex justify-center">
          <div className="w-full max-w-[500px]">
            <div className="flex items-center justify-between">
                <h1 className="Serif Header font-normal tracking-tight" style={{ fontFamily: 'Fraunces, serif', fontSize: '50px' }}>Email Tags</h1>
              <div className="flex items-center space-x-2">
                <Switch id="auto-tag" />
              </div>
            </div>
            <p className="text-muted-foreground mt-2">Fluidebase automatically categorizes your emails using smart tags, helping you stay focused on what matters most.</p>
            <div className="mt-6">
            <Table className="[&_tr]:border-0">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"><span className="sr-only">Select</span></TableHead>
                  <TableHead>Tag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((tag) => {
                  const isSelected = selectedTags.has(tag.id)
                  return (
                    <TableRow 
                      key={tag.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleTag(tag.id)}
                    >
                      <TableCell>
                        <Checkbox 
                          checked={isSelected}
                          onChange={() => toggleTag(tag.id)}
                          aria-label={`Select ${tag.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={tag.variant === "blue" ? undefined : tag.variant}
                          className={tag.variant === "blue" ? "bg-blue-500 text-white dark:bg-blue-600" : ""}
                        >
                          {tag.name}
                        </Badge>
                        {tag.description && ` ${tag.description}`}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}


