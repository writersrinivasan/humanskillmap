'use client'

import React, { useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface OTPInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  error?: boolean
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
}: OTPInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  const focusAt = (index: number) => {
    const el = inputsRef.current[index]
    if (el) {
      el.focus()
      el.select()
    }
  }

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
      const char = e.target.value.replace(/\D/g, '').slice(-1)
      const chars = value.split('')
      chars[index] = char

      const next = chars.join('').slice(0, length)
      onChange(next)

      if (char && index < length - 1) {
        focusAt(index + 1)
      }

      if (next.length === length) {
        onComplete?.(next)
      }
    },
    [value, length, onChange, onComplete]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
      if (e.key === 'Backspace') {
        if (value[index]) {
          // Clear current
          const chars = value.split('')
          chars[index] = ''
          onChange(chars.join(''))
        } else if (index > 0) {
          // Move back
          const chars = value.split('')
          chars[index - 1] = ''
          onChange(chars.join(''))
          focusAt(index - 1)
        }
        e.preventDefault()
      } else if (e.key === 'ArrowLeft' && index > 0) {
        focusAt(index - 1)
        e.preventDefault()
      } else if (e.key === 'ArrowRight' && index < length - 1) {
        focusAt(index + 1)
        e.preventDefault()
      }
    },
    [value, length, onChange]
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault()
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
      if (!pasted) return
      onChange(pasted.padEnd(length, '').slice(0, length))
      if (pasted.length === length) {
        onComplete?.(pasted)
        focusAt(length - 1)
      } else {
        focusAt(Math.min(pasted.length, length - 1))
      }
    },
    [length, onChange, onComplete]
  )

  return (
    <div className="flex gap-2 sm:gap-3" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          aria-label={`OTP digit ${i + 1}`}
          className={cn(
            'h-12 w-12 rounded-lg border-2 text-center text-xl font-semibold transition-colors',
            'focus:outline-none focus:ring-0',
            'sm:h-14 sm:w-14 sm:text-2xl',
            error
              ? 'border-destructive bg-destructive/5 text-destructive'
              : value[i]
              ? 'border-primary bg-primary/5 text-foreground'
              : 'border-input bg-background text-foreground',
            'focus:border-primary',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        />
      ))}
    </div>
  )
}
