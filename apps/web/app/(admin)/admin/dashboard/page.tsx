import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CandidateTable } from '@/components/admin/CandidateTable'
import {
  UsersIcon,
  FileTextIcon,
  CheckCircle2Icon,
  ClockIcon,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // Stats
  const [totalUsersRes, totalUploadsRes, processedRes, pendingRes, recentUploadsRes] =
    await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'candidate'),
      supabase.from('resume_uploads').select('id', { count: 'exact', head: true }),
      supabase
        .from('resume_uploads')
        .select('id', { count: 'exact', head: true })
        .in('status', ['processed', 'uploaded']),
      supabase
        .from('resume_uploads')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      // Recent 20 uploads with user info
      supabase
        .from('resume_uploads')
        .select(`
          id, original_filename, status, created_at, is_current,
          users!inner ( id, email, phone, profiles ( full_name, city ) )
        `)
        .eq('is_current', true)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

  const stats = [
    {
      label: 'Total Candidates',
      value: totalUsersRes.count ?? 0,
      icon: UsersIcon,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Resumes Uploaded',
      value: totalUploadsRes.count ?? 0,
      icon: FileTextIcon,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: 'Successfully Stored',
      value: processedRes.count ?? 0,
      icon: CheckCircle2Icon,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Pending Processing',
      value: pendingRes.count ?? 0,
      icon: ClockIcon,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of all candidate activity
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">
                    {value.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className={`rounded-lg p-2 ${bg}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent uploads table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Uploads</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <CandidateTable uploads={recentUploadsRes.data ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
