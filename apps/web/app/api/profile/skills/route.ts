import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addSkillSchema } from '@/lib/validations/profile'

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
    const parsed = addSkillSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('skills')
      .insert({
        user_id: user.id,
        ...parsed.data,
        source: 'manual',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to add skill' }, { status: 500 })
    }

    return NextResponse.json({ skill: data }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/profile/skills]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
