import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

export default function Page() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="p-4 lg:p-6">
          <Card>
            <CardHeader>
              <CardTitle>connect your email</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Setup progress</span>
                    <span>1/4</span>
                  </div>
                  <Progress value={25} />
                </div>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>
                    Connect your email provider
                    <div className="mt-2 flex gap-3">
                      <Button className="bg-white text-black hover:bg-gray-100 border border-gray-300">
                        <img src="/gmail.svg" alt="Gmail" className="w-4 h-4 mr-2" />
                        Gmail
                      </Button>
                      <Button className="bg-white text-black hover:bg-gray-100 border border-gray-300">
                        <img src="/outlook.svg" alt="Outlook" className="w-4 h-4 mr-2" />
                        Outlook
                      </Button>
                    </div>
                  </li>
                  <li>
                    Connect your calendar
                    <div className="mt-2 flex gap-3">
                      <Button className="bg-white text-black hover:bg-gray-100 border border-gray-300">
                        <img src="/google_calendar.svg" alt="Google Calendar" className="w-4 h-4 mr-2" />
                        Google Calendar
                      </Button>
                      <Button className="bg-white text-black hover:bg-gray-100 border border-gray-300">
                        <img src="/outlook.svg" alt="Outlook" className="w-4 h-4 mr-2" />
                        Outlook
                      </Button>
                    </div>
                  </li>
                  <li>Start your free trial</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
