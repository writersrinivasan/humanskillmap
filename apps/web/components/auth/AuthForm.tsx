'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { PhoneIcon, MailIcon, Loader2Icon, ArrowRightIcon } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type AuthMode = 'phone' | 'email'

const phoneSchema = z.object({
  phone: z
    .string()
    .min(10, 'Enter a 10-digit mobile number')
    .max(10, 'Enter a 10-digit mobile number')
    .regex(/^\d{10}$/, 'Enter a valid 10-digit mobile number'),
})

const emailSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})

export function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<AuthMode>('phone')
  const [isLoading, setIsLoading] = useState(false)

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' },
  })

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })

  async function sendOTP(type: AuthMode, value: string) {
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to send OTP')
      }

      const nextPath = searchParams.get('next') ?? '/upload'
      const params = new URLSearchParams({
        type,
        value,
        next: nextPath,
      })
      router.push(`/verify-otp?${params.toString()}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  async function onPhoneSubmit(data: z.infer<typeof phoneSchema>) {
    await sendOTP('phone', data.phone)
  }

  async function onEmailSubmit(data: z.infer<typeof emailSchema>) {
    await sendOTP('email', data.email)
  }

  return (
    <Tabs
      value={mode}
      onValueChange={(v) => setMode(v as AuthMode)}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="phone" className="gap-1.5">
          <PhoneIcon className="h-3.5 w-3.5" />
          Mobile
        </TabsTrigger>
        <TabsTrigger value="email" className="gap-1.5">
          <MailIcon className="h-3.5 w-3.5" />
          Email
        </TabsTrigger>
      </TabsList>

      <AnimatePresence mode="wait">
        <TabsContent value="phone" asChild>
          <motion.div
            key="phone"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.15 }}
          >
            <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Mobile Number</Label>
                <div className="flex">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground select-none">
                    +91
                  </span>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="98765 43210"
                    maxLength={10}
                    className="rounded-l-none"
                    autoComplete="tel-national"
                    autoFocus
                    {...phoneForm.register('phone', {
                      onChange: (e) => {
                        e.target.value = e.target.value.replace(/\D/g, '')
                      },
                    })}
                  />
                </div>
                {phoneForm.formState.errors.phone && (
                  <p className="text-sm text-destructive">
                    {phoneForm.formState.errors.phone.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
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
          </motion.div>
        </TabsContent>

        <TabsContent value="email" asChild>
          <motion.div
            key="email"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
          >
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  {...emailForm.register('email')}
                />
                {emailForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {emailForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
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
          </motion.div>
        </TabsContent>
      </AnimatePresence>
    </Tabs>
  )
}
