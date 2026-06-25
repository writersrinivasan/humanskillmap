import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: userRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userRow || !['admin', 'super_admin'].includes(userRow.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
    const status = searchParams.get('status')

    const svc = createServiceClient()
    let query = svc
      .from('resume_uploads')
      .select(
        `
        id, original_filename, status, created_at, file_size_bytes,
        users!inner ( id, email, phone, profiles ( full_name, city, completion_pct, availability_status ) )
      `,
        { count: 'exact' }
      )
      .eq('is_current', true)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (status) {
      query = query.eq('status', status as 'pending' | 'uploaded' | 'processing' | 'processed' | 'failed')
    }

    const { data, count, error } = await query

    if (error) {
      console.error('[admin/candidates] Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 })
    }

    return NextResponse.json({
      candidates: data,
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    })
  } catch (err) {
    console.error('[admin/candidates]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
