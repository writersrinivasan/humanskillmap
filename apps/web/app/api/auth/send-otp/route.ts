import { NextRequest, NextResponse } from 'next/server'
import { sendOtpSchema } from '@/lib/validations/auth'
import { createServiceClient } from '@/lib/supabase/server'

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

    const { type, value } = parsed.data

    if (type !== 'email') {
      return NextResponse.json({ error: 'Only email OTP is supported' }, { status: 400 })
    }

    const admin = createServiceClient()

    // Generate OTP + hashed_token via admin (Supabase does NOT send email)
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: value,
    })

    if (error || !data?.properties?.email_otp) {
      console.error('[send-otp] generateLink error:', error?.name, error?.message, error?.status)
      return NextResponse.json({
        error: 'Failed to generate OTP',
        detail: error?.message ?? 'no email_otp in response',
      }, { status: 500 })
    }

    const { hashed_token } = data.properties

    // Generate our own 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000))

    // Store our OTP + Supabase hashed_token
    const svc = admin as any
    const { error: storeErr } = await svc.from('email_otps').upsert(
      {
        email: value,
        otp,
        hashed_token,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      },
      { onConflict: 'email' }
    )

    if (storeErr) {
      console.error('[send-otp] store error:', storeErr.message)
      return NextResponse.json({ error: 'Failed to store OTP' }, { status: 500 })
    }

    // Send via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'HumanSkillMap <onboarding@resend.dev>',
        to: [value],
        subject: `${otp} is your HumanSkillMap code`,
        html: `
          <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:24px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px;">
              <div style="background:linear-gradient(135deg,#2D6A4F,#1B4332);width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;">
                <span style="color:white;font-weight:800;font-size:13px;">HSM</span>
              </div>
              <span style="font-weight:700;font-size:18px;color:#1B4332;">HumanSkillMap</span>
            </div>
            <h2 style="font-size:20px;color:#1C1712;margin:0 0 8px;">Your verification code</h2>
            <p style="color:#7A7166;font-size:14px;margin:0 0 24px;">Enter this code to sign in to your account.</p>
            <div style="background:#F9F5EE;border:1px solid #DDD5C7;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
              <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#1B4332;">${otp}</span>
            </div>
            <p style="color:#7A7166;font-size:13px;margin:0;">This code expires in 10 minutes. Never share it with anyone.</p>
          </div>
        `,
      }),
    })

    if (!resendRes.ok) {
      const resendError = await resendRes.json().catch(() => ({}))
      console.error('[send-otp] Resend error:', resendError)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true, expires_in: 600 })
  } catch (err) {
    console.error('[send-otp] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
