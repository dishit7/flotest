import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Mail, Sparkles, Zap, Shield, ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  
  const params = await searchParams;
  if (params.code) {
    redirect(`/auth/callback?code=${params.code}`);
  }
  return (
    <div className="min-h-dvh">
 
      <section className="relative overflow-hidden px-6 py-32 sm:py-40 lg:px-8">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.primary/10),transparent)]" />
        
        <div className="mx-auto max-w-4xl text-center space-y-8">
          <Badge className="mb-2 px-4 py-1.5 text-sm">
            <Sparkles className="mr-1.5 size-3.5" />
            AI-Powered Email Management
          </Badge>
          
          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl leading-tight">
            Transform Your Gmail
            <br />
            <span className="text-primary">Into a Productivity Hub</span>
          </h1>
          
          <p className="text-xl leading-relaxed text-muted-foreground max-w-2xl mx-auto">
            Automatically categorize emails, generate smart replies with AI, and manage your inbox with custom labels. 
            All powered by Google AI and seamlessly integrated with Gmail.
          </p>
          
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button asChild size="lg" className="h-12 px-8 text-base">
              <Link href="/auth/signin">
                Get Started
                <ArrowRight className="ml-2 size-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="h-12 px-8 text-base" asChild>
              <Link href="#features">
                Learn More
              </Link>
            </Button>
          </div>
        </div>
      </section>

   
      <section id="features" className="py-24 sm:py-32 px-6 lg:px-8 bg-muted/30">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Everything you need to manage emails
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features to help you stay organized and productive
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                  <Mail className="h-7 w-7 text-primary" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-xl">Smart Categorization</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Automatically categorize your emails into TO_RESPOND, IMPORTANT, MARKETING, and more
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-xl">AI-Powered Drafts</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Generate intelligent email replies with Google Gemini AI, customized to your tone
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                  <Zap className="h-7 w-7 text-primary" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-xl">Custom Labels</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Create and manage custom Gmail labels with colors directly from the dashboard
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-xl">Secure & Private</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Built with Supabase auth and OAuth 2.0. Your data stays in your Gmail account
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                  <Mail className="h-7 w-7 text-primary" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-xl">Real-time Sync</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Gmail webhook integration keeps your inbox synchronized in real-time
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                  <Zap className="h-7 w-7 text-primary" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-xl">Batch Operations</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Generate drafts for multiple emails at once and manage them efficiently
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

    
      <section className="py-32 px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 shadow-xl">
            <CardContent className="pt-12 pb-12 space-y-6">
              <h2 className="text-4xl font-bold tracking-tight">
                Ready to supercharge your email workflow?
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed max-w-lg mx-auto">
                Sign in with your Google account to get started in seconds
              </p>
              <Button asChild size="lg" className="h-12 px-8 text-base">
                <Link href="/auth/signin">
                  Get Started Free
                  <ArrowRight className="ml-2 size-5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

     
      <footer className="border-t py-12 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-sm text-muted-foreground">© 2024 Flobase. Built with Next.js, Supabase, and Google AI.</p>
        </div>
      </footer>
    </div>
  );
}
