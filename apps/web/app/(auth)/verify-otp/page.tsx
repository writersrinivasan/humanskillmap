'use client'

import { useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeftIcon, Loader2Icon, ShieldCheckIcon } from 'lucide-react'
import { toast } from 'sonner'

import { OTPInput } from '@/components/auth/OTPInput'
import { Button } from '@/components/ui/button'

const OTP_LENGTH = 6
const RESEND_SECONDS = 60

function VerifyOTPContent() {
  const router = useRouter()
  const params = useSearchParams()

  const type = (params.get('type') ?? 'phone') as 'phone' | 'email'
  const value = params.get('value') ?? ''
  const next = params.get('next') ?? '/upload'

  const maskedValue =
    type === 'phone'
      ? `+91 XXXXXX${value.slice(-4)}`
      : value.replace(/(.{2}).+(@.+)/, '$1****$2')

  const [otp, setOtp] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(RESEND_SECONDS)
  const [hasError, setHasError] = useState(false)

  // Countdown timer
  const startCountdown = useCallback(() => {
    setResendCountdown(RESEND_SECONDS)
    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  const verifyOTP = useCallback(
    async (token: string) => {
      if (token.length !== OTP_LENGTH || isVerifying) return
      setIsVerifying(true)
      setHasError(false)

      try {
        const res = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, value, token }),
        })

        const data = await res.json()

        if (!res.ok) {
          setHasError(true)
          setOtp('')
          toast.error(data.error ?? 'Invalid OTP. Please try again.')
          return
        }

        toast.success('Verified! Welcome to HumanSkillMap (HSM).')
        window.location.href = next
      } catch {
        setHasError(true)
        toast.error('Something went wrong. Please try again.')
      } finally {
        setIsVerifying(false)
      }
    },
    [type, value, next, router, isVerifying]
  )

  const resendOTP = async () => {
    if (resendCountdown > 0 || isResending) return
    setIsResending(true)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value }),
      })
      if (!res.ok) throw new Error()
      toast.success('New OTP sent!')
      startCountdown()
    } catch {
      toast.error('Failed to resend OTP. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.back()}
          className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Go back"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Enter your OTP
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            We sent a 6-digit code to{' '}
            <span className="font-medium text-foreground">{maskedValue}</span>
          </p>
        </div>
      </div>

      {/* OTP Input */}
      <div className="flex flex-col items-center gap-4">
        <OTPInput
          length={OTP_LENGTH}
          value={otp}
          onChange={setOtp}
          onComplete={verifyOTP}
          disabled={isVerifying}
          error={hasError}
        />

        {isVerifying && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="h-4 w-4 animate-spin" />
            Verifying…
          </div>
        )}

        {hasError && !isVerifying && (
          <p className="text-sm text-destructive text-center">
            Incorrect OTP. Please check and try again.
          </p>
        )}
      </div>

      {/* Verify button (fallback for non-auto-submit) */}
      <Button
        size="lg"
        className="w-full"
        onClick={() => verifyOTP(otp)}
        disabled={otp.length < OTP_LENGTH || isVerifying}
      >
        {isVerifying ? (
          <Loader2Icon className="animate-spin" />
        ) : (
          <>
            <ShieldCheckIcon className="h-4 w-4" />
            Verify OTP
          </>
        )}
      </Button>

      {/* Resend */}
      <div className="text-center">
        {resendCountdown > 0 ? (
          <p className="text-sm text-muted-foreground">
            Resend OTP in{' '}
            <span className="font-mono font-medium text-foreground tabular-nums">
              {String(Math.floor(resendCountdown / 60)).padStart(2, '0')}:
              {String(resendCountdown % 60).padStart(2, '0')}
            </span>
          </p>
        ) : (
          <button
            onClick={resendOTP}
            disabled={isResending}
            className="text-sm text-primary hover:underline disabled:opacity-50 disabled:no-underline"
          >
            {isResending ? 'Sending…' : "Didn't receive it? Resend OTP"}
          </button>
        )}
      </div>
    </motion.div>
  )
}

export default function VerifyOTPPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="flex gap-2 justify-center">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 w-14 rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      }
    >
      <VerifyOTPContent />
    </Suspense>
  )
}
