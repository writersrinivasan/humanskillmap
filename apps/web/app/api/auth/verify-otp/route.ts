import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyOtpSchema } from '@/lib/validations/auth'
import type { Database } from '@/types/database'

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
    const svc = createServiceClient() as any

    if (type === 'phone') {
      return NextResponse.json({ error: 'Phone OTP not supported' }, { status: 400 })
    }

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

    // Collect cookies Supabase wants to set
    const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach((c) => pendingCookies.push(c as typeof pendingCookies[0]))
          },
        },
      }
    )

    const verifyResult = await supabase.auth.verifyOtp({
      token_hash: otpRow.hashed_token,
      type: 'magiclink',
    })

    if (verifyResult.error) {
      console.error('[verify-otp] Supabase error:', verifyResult.error.message)
      return NextResponse.json(
        { error: 'Verification failed. Please request a new OTP.' },
        { status: 401 }
      )
    }

    const { user, session } = verifyResult.data

    if (!user || !session) {
      return NextResponse.json({ error: 'Verification failed.' }, { status: 500 })
    }

    // Clean up used OTP
    await svc.from('email_otps').delete().eq('email', value)

    // Ensure public.users row exists
    await svc.from('users').upsert(
      {
        id: user.id,
        email: user.email ?? null,
        phone: user.phone ?? null,
        last_login_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

    // Audit log
    await svc.from('audit_logs').insert({
      user_id: user.id,
      action: 'login',
      resource_type: 'session',
      metadata: {
        method: type,
        user_agent: request.headers.get('user-agent'),
      },
    })

    // Build response and attach session cookies so browser persists the session
    const response = NextResponse.json({ success: true, user: { id: user.id } })
    pendingCookies.forEach(({ name, value: val, options }) => {
      response.cookies.set(name, val, options as Parameters<typeof response.cookies.set>[2])
    })

    return response
  } catch (err) {
    console.error('[verify-otp] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
