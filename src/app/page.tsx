import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Mail, Sparkles, Zap, Shield, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-dvh">
 
      <section className="relative overflow-hidden px-6 py-24 sm:py-32 lg:px-8">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.primary/10),transparent)]" />
        
        <div className="mx-auto max-w-4xl text-center">
          <Badge className="mb-4">
            <Sparkles className="mr-1 size-3" />
            AI-Powered Email Management
          </Badge>
          
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Transform Your Gmail
            <br />
            <span className="text-primary">Into a Productivity Hub</span>
          </h1>
          
          <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
            Automatically categorize emails, generate smart replies with AI, and manage your inbox with custom labels. 
            All powered by Google AI and seamlessly integrated with Gmail.
          </p>
          
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/auth/signin">
                Get Started
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="#features">
                Learn More
              </Link>
            </Button>
          </div>
        </div>
      </section>

   
      <section id="features" className="py-24 sm:py-32 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to manage emails
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Powerful features to help you stay organized and productive
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Smart Categorization</CardTitle>
                <CardDescription>
                  Automatically categorize your emails into TO_RESPOND, IMPORTANT, MARKETING, and more
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>AI-Powered Drafts</CardTitle>
                <CardDescription>
                  Generate intelligent email replies with Google Gemini AI, customized to your tone
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Custom Labels</CardTitle>
                <CardDescription>
                  Create and manage custom Gmail labels with colors directly from the dashboard
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Secure & Private</CardTitle>
                <CardDescription>
                  Built with Supabase auth and OAuth 2.0. Your data stays in your Gmail account
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Real-time Sync</CardTitle>
                <CardDescription>
                  Gmail webhook integration keeps your inbox synchronized in real-time
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Batch Operations</CardTitle>
                <CardDescription>
                  Generate drafts for multiple emails at once and manage them efficiently
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

    
      <section className="py-24 px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="pt-8 pb-8">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Ready to supercharge your email workflow?
              </h2>
              <p className="text-muted-foreground mb-6">
                Sign in with your Google account to get started in seconds
              </p>
              <Button asChild size="lg">
                <Link href="/auth/signin">
                  Get Started Free
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

     
      <footer className="border-t py-12 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center text-sm text-muted-foreground">
          <p>© 2024 Flobase. Built with Next.js, Supabase, and Google AI.</p>
        </div>
      </footer>
    </div>
  );
}
