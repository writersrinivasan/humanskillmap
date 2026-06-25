import { Suspense } from 'react'
import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth/AuthForm'

export const metadata: Metadata = {
  title: 'Sign In — TalentVault',
}

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Welcome back</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your mobile or email to receive a one-time password.
        </p>
      </div>

      <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted" />}>
        <AuthForm />
      </Suspense>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            No password needed. Ever.
          </span>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        First time here? Just enter your details — we'll create your account
        automatically.
      </p>
    </div>
  )
}
