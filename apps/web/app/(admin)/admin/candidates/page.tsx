import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CandidateTable } from '@/components/admin/CandidateTable'

export const dynamic = 'force-dynamic'

export default async function CandidatesPage() {
  const supabase = await createClient()

  const { data: uploads } = await supabase
    .from('resume_uploads')
    .select(`
      id, original_filename, status, created_at, is_current,
      users!inner ( id, email, phone, profiles ( full_name, city ) )
    `)
    .eq('is_current', true)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">All Candidates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {uploads?.length ?? 0} candidates with uploaded resumes
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <CandidateTable uploads={uploads ?? []} showDownload />
        </CardContent>
      </Card>
    </div>
  )
}
