import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const svc = createServiceClient()

    // Fetch the upload record — allow owner or admin
    const { data: userRow } = await svc
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = userRow?.role === 'admin' || userRow?.role === 'super_admin'

    const query = svc
      .from('resume_uploads')
      .select('id, user_id, storage_path, original_filename, status')
      .eq('id', id)

    if (!isAdmin) {
      query.eq('user_id', user.id)
    }

    const { data: upload, error } = await query.single()

    if (error || !upload) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    // Generate a short-lived presigned download URL (5 minutes)
    const { data: signed, error: storageError } = await svc.storage
      .from('resumes')
      .createSignedUrl(upload.storage_path, 300)

    if (storageError || !signed) {
      console.error('[download] Storage error:', storageError)
      return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
    }

    // Audit log
    await svc.from('audit_logs').insert({
      user_id: user.id,
      action: isAdmin ? 'admin_resume_download' : 'resume_download',
      resource_type: 'resume_upload',
      resource_id: id,
    })

    // Redirect to the signed URL
    return NextResponse.redirect(signed.signedUrl)
  } catch (err) {
    console.error('[download]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
