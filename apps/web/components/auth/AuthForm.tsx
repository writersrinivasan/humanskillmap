'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2Icon, ArrowRightIcon, MailIcon } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const emailSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})

export function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(data: z.infer<typeof emailSchema>) {
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', value: data.email }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error ?? 'Failed to send OTP')
      }

      const nextPath = searchParams.get('next') ?? '/upload'
      const params = new URLSearchParams({ type: 'email', value: data.email, next: nextPath })
      router.push(`/verify-otp?${params.toString()}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="flex items-center gap-1.5">
          <MailIcon className="h-3.5 w-3.5" />
          Email Address
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          autoFocus
          {...form.register('email')}
        />
        {form.formState.errors.email && (
          <p className="text-sm text-destructive">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <Loader2Icon className="animate-spin" />
        ) : (
          <>
            Send OTP
            <ArrowRightIcon />
          </>
        )}
      </Button>
    </form>
  )
}
