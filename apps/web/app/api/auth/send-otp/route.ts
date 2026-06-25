import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendOtpSchema } from '@/lib/validations/auth'
import { toE164Phone } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = sendOtpSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { type, value } = parsed.data

    let error: Error | null = null

    if (type === 'phone') {
      const phone = toE164Phone(value)
      const result = await supabase.auth.signInWithOtp({
        phone,
        options: {
          shouldCreateUser: true,
        },
      })
      if (result.error) error = result.error
    } else {
      const result = await supabase.auth.signInWithOtp({
        email: value,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: undefined, // We handle verify in-app
        },
      })
      if (result.error) error = result.error
    }

    if (error) {
      console.error('[send-otp] Supabase error:', error.message)
      return NextResponse.json(
        { error: 'Failed to send OTP. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, expires_in: 300 })
  } catch (err) {
    console.error('[send-otp] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
