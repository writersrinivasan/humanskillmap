import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { uploadInitSchema } from '@/lib/validations/resume'
import { randomUUID } from 'crypto'

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
    const parsed = uploadInitSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { filename, mimeType, fileSize } = parsed.data

    // Sanitise the original filename
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'pdf'
    const safeFilename = `${randomUUID()}.${ext}`
    const storagePath = `${user.id}/${safeFilename}`

    // Create the DB record first (so we have an ID to return)
    const svc = createServiceClient()
    const { data: uploadRow, error: dbError } = await svc
      .from('resume_uploads')
      .insert({
        user_id: user.id,
        storage_path: storagePath,
        original_filename: filename,
        file_size_bytes: fileSize,
        mime_type: mimeType,
        status: 'pending',
      })
      .select()
      .single()

    if (dbError || !uploadRow) {
      console.error('[upload/init] DB error:', dbError)
      return NextResponse.json({ error: 'Failed to create upload record' }, { status: 500 })
    }

    // Create a presigned upload URL (the client PUTs directly to Supabase Storage)
    const { data: signed, error: storageError } = await svc.storage
      .from('resumes')
      .createSignedUploadUrl(storagePath)

    if (storageError || !signed) {
      // Roll back the DB record
      await svc.from('resume_uploads').delete().eq('id', uploadRow.id)
      console.error('[upload/init] Storage error:', storageError)
      return NextResponse.json({ error: 'Failed to prepare upload' }, { status: 500 })
    }

    return NextResponse.json({
      uploadId: uploadRow.id,
      signedUrl: signed.signedUrl,
      token: signed.token,
      storagePath,
    })
  } catch (err) {
    console.error('[upload/init] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
