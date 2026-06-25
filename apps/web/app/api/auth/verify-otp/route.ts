import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyOtpSchema } from '@/lib/validations/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = verifyOtpSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { type, value, token } = parsed.data

    if (type === 'phone') {
      return NextResponse.json({ error: 'Phone OTP not supported' }, { status: 400 })
    }

    const svc = createServiceClient() as any

    // Look up stored hashed_token for this email + OTP
    const { data: otpRow, error: lookupErr } = await svc
      .from('email_otps')
      .select('hashed_token, expires_at')
      .eq('email', value)
      .eq('otp', token)
      .single()

    if (lookupErr || !otpRow) {
      return NextResponse.json({ error: 'Invalid or expired OTP.' }, { status: 401 })
    }

    if (new Date(otpRow.expires_at) < new Date()) {
      await svc.from('email_otps').delete().eq('email', value)
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new one.' },
        { status: 401 }
      )
    }

    // Delete the OTP row — it's been consumed
    await svc.from('email_otps').delete().eq('email', value)

    // Return hashed_token to the browser — client will call verifyOtp directly
    // so the Supabase browser client handles session cookie storage natively
    return NextResponse.json({ hashed_token: otpRow.hashed_token })
  } catch (err) {
    console.error('[verify-otp] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
