'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GalleryVerticalEnd, Mail, Sparkles, Zap, Shield, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleGoogleAuth = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`,
          scopes: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.insert',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        },
      })

      if (error) {
        console.error('Google OAuth Error:', error.message)
        setError(error.message)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-svh flex items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-300/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-300/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000" />
      </div>

      {/* Content */}
      <div className="relative w-full max-w-6xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left side - Branding and features */}
          <div className="space-y-8 text-center lg:text-left">
            <Link href="/" className="inline-flex items-center gap-2 font-semibold text-lg hover:opacity-80 transition-opacity">
              <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg shadow-lg">
                <GalleryVerticalEnd className="size-5" />
              </div>
              <span className="text-2xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                flobase
              </span>
            </Link>
            
            <div className="space-y-4">
              <h1 className="text-5xl font-bold tracking-tight">
                Welcome to{' '}
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Flobase
                </span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Transform your Gmail into an AI-powered productivity hub. 
                Smart categorization, intelligent replies, and seamless workflow management.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="p-4 rounded-lg bg-muted/50 backdrop-blur-sm border border-border/50 hover:bg-muted/70 transition-colors">
                <Sparkles className="size-5 text-primary mb-2" />
                <h3 className="font-semibold text-sm mb-1">AI-Powered</h3>
                <p className="text-xs text-muted-foreground">Smart categorization & replies</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 backdrop-blur-sm border border-border/50 hover:bg-muted/70 transition-colors">
                <Zap className="size-5 text-primary mb-2" />
                <h3 className="font-semibold text-sm mb-1">Lightning Fast</h3>
                <p className="text-xs text-muted-foreground">Real-time email processing</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 backdrop-blur-sm border border-border/50 hover:bg-muted/70 transition-colors">
                <Shield className="size-5 text-primary mb-2" />
                <h3 className="font-semibold text-sm mb-1">Secure</h3>
                <p className="text-xs text-muted-foreground">OAuth 2.0 protected</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 backdrop-blur-sm border border-border/50 hover:bg-muted/70 transition-colors">
                <Mail className="size-5 text-primary mb-2" />
                <h3 className="font-semibold text-sm mb-1">Gmail Sync</h3>
                <p className="text-xs text-muted-foreground">Seamless integration</p>
              </div>
            </div>
          </div>

          {/* Right side - Auth card */}
          <div className="flex justify-center lg:justify-end">
            <Card className="w-full max-w-md shadow-2xl border-0 backdrop-blur-xl bg-background/80">
              <CardHeader className="text-center space-y-2 pb-6">
                <CardTitle className="text-3xl font-bold">Get Started</CardTitle>
                <CardDescription className="text-base">
                  Sign in or create your account in one click
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {error && (
                  <div className="text-sm text-destructive text-center p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    {error}
                  </div>
                )}

                <Button 
                  size="lg"
                  type="button"
                  className="w-full h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-all" 
                  onClick={handleGoogleAuth}
                  disabled={isLoading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-3 h-6 w-6">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="white"
                    />
                  </svg>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span>
                      Connecting...
                    </span>
                  ) : (
                    'Continue with Google'
                  )}
                  <ArrowRight className="ml-auto h-5 w-5" />
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">What you get</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                        <Sparkles className="size-4 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">AI-Powered Categorization</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Automatically organize emails into smart categories
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                        <Mail className="size-4 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Smart Reply Suggestions</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Generate intelligent email drafts with AI
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                        <Zap className="size-4 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Real-time Sync</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Instant updates across all your devices
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-2">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <Shield className="size-3.5" />
                    How it works
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1.5 list-none">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Click &quot;Continue with Google&quot; to get started</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Existing users sign in, new users auto-register</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Grant Gmail permissions for full functionality</span>
                    </li>
                  </ul>
                </div>

                <p className="text-center text-xs text-muted-foreground leading-relaxed">
                  By continuing, you agree to our{' '}
                  <Link href="#" className="text-primary hover:underline font-medium">
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link href="#" className="text-primary hover:underline font-medium">
                    Privacy Policy
                  </Link>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
