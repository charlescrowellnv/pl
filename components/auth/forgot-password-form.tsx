'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export function ForgotPasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      })
      if (error) throw error
      setSuccess(true)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className={cn('flex flex-col gap-3', className)} {...props}>
        <p className="text-sm font-normal">Check your email.</p>
        <p className="text-sm font-light text-muted-foreground">
          If you registered with this address, you&apos;ll receive a link to reset your password.
        </p>
        <div className="mt-2">
          <Link href="/auth/login" className="text-sm font-normal text-foreground underline underline-offset-2">
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <form onSubmit={handleForgotPassword}>
        <div className="flex flex-col gap-5">
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-sm font-normal">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full rounded-none font-normal" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send reset email'}
          </Button>
        </div>
        <div className="mt-6 text-sm font-light text-muted-foreground">
          Remember your password?{' '}
          <Link href="/auth/login" className="font-normal text-foreground underline underline-offset-2">
            Login
          </Link>
        </div>
      </form>
    </div>
  )
}
