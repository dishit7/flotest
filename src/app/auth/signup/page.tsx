'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from '@/components/ui/field'
import { GalleryVerticalEnd } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleGoogleSignUp = async () => {
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

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      setError(null)
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
                      emailRedirectTo: `https://your-actual-domain.com/auth/callback`,
        },
      })

      if (error) {
        console.error('Email Signup Error:', error.message)
        setError(error.message)
      } else {
        // Show success message
        router.push('/auth/verify-email')
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <GalleryVerticalEnd className="size-4" />
          </div>
          flobase
        </Link>
        
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Create an account</CardTitle>
            <CardDescription>
              Sign up to get started with flobase
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailSignUp}>
              <FieldGroup>
                <Field>
                  <Button 
                    variant="outline" 
                    type="button"
                    className="w-full" 
                    onClick={handleGoogleSignUp}
                    disabled={isLoading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                      <path
                        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                        fill="currentColor"
                      />
                    </svg>
                    {isLoading ? 'Signing up...' : 'Sign up with Google'}
                  </Button>
                </Field>

                <FieldSeparator>Or continue with email</FieldSeparator>

                {error && (
                  <div className="text-sm text-red-500 text-center">
                    {error}
                  </div>
                )}

                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <FieldDescription>
                    Must be at least 8 characters long
                  </FieldDescription>
                </Field>

                <Field>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating account...' : 'Create account'}
                  </Button>
                </Field>

                <FieldDescription className="text-center">
                  Already have an account?{' '}
                  <Link 
                    href="/auth/signin"
                    className="text-primary hover:underline"
                  >
                    Sign in
                  </Link>
                </FieldDescription>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <FieldDescription className="text-center text-sm text-muted-foreground">
          By clicking continue, you agree to our{' '}
          <Link href="#" className="hover:underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="#" className="hover:underline">Privacy Policy</Link>.
        </FieldDescription>
      </div>
    </div>
  )
}