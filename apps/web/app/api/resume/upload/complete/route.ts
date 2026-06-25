import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { uploadCompleteSchema } from '@/lib/validations/resume'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = uploadCompleteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { uploadId } = parsed.data
    const svc = createServiceClient()

    // Verify this upload belongs to the authenticated user
    const { data: existing } = await svc
      .from('resume_uploads')
      .select('id, user_id, status')
      .eq('id', uploadId)
      .single()

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }

    if (existing.status !== 'pending') {
      return NextResponse.json(
        { error: 'Upload is not in pending state' },
        { status: 409 }
      )
    }

    // Mark as uploaded (AI processing will change this to 'processing' → 'processed' in M2)
    const { error: updateError } = await svc
      .from('resume_uploads')
      .update({ status: 'uploaded' })
      .eq('id', uploadId)

    if (updateError) {
      console.error('[upload/complete] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update upload status' }, { status: 500 })
    }

    // Audit log
    await svc.from('audit_logs').insert({
      user_id: user.id,
      action: 'resume_upload',
      resource_type: 'resume_upload',
      resource_id: uploadId,
      metadata: { status: 'uploaded' },
    })

    return NextResponse.json({ success: true, resumeId: uploadId, status: 'uploaded' })
  } catch (err) {
    console.error('[upload/complete] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
