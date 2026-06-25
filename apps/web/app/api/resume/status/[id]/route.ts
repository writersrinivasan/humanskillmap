import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const { data, error } = await supabase
      .from('resume_uploads')
      .select('id, status, processing_attempts, error_message, created_at, processed_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }

    const progressMap: Record<string, number> = {
      pending:    10,
      uploaded:   30,
      processing: 65,
      processed:  100,
      failed:     0,
    }

    return NextResponse.json({
      id: data.id,
      status: data.status,
      progress: progressMap[data.status] ?? 0,
      error: data.error_message,
      created_at: data.created_at,
      processed_at: data.processed_at,
    })
  } catch (err) {
    console.error('[resume/status]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
