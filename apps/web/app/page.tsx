import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // Check if user has uploaded a resume
    const { data: upload } = await supabase
      .from('resume_uploads')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_current', true)
      .single()

    redirect(upload ? '/profile' : '/upload')
  }

  redirect('/login')
}
