import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { verifyOtpSchema } from '@/lib/validations/auth'
import { toE164Phone } from '@/lib/utils'

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

    const supabase = await createClient()
    const { type, value, token } = parsed.data

    let verifyResult

    if (type === 'phone') {
      verifyResult = await supabase.auth.verifyOtp({
        phone: toE164Phone(value),
        token,
        type: 'sms',
      })
    } else {
      verifyResult = await supabase.auth.verifyOtp({
        email: value,
        token,
        type: 'email',
      })
    }

    if (verifyResult.error) {
      console.error('[verify-otp] Supabase error:', verifyResult.error.message)
      const isInvalid = verifyResult.error.message.toLowerCase().includes('invalid')
        || verifyResult.error.message.toLowerCase().includes('expired')
      return NextResponse.json(
        { error: isInvalid ? 'Invalid or expired OTP.' : 'Verification failed.' },
        { status: isInvalid ? 401 : 500 }
      )
    }

    const { user, session } = verifyResult.data

    if (!user || !session) {
      return NextResponse.json({ error: 'Verification failed.' }, { status: 500 })
    }

    // Ensure public.users row exists (trigger handles this, but upsert as safety net)
    const svc = createServiceClient()
    await svc
      .from('users')
      .upsert(
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

    return NextResponse.json({ success: true, user: { id: user.id } })
  } catch (err) {
    console.error('[verify-otp] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
