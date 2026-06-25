import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileTextIcon, DownloadIcon, RefreshCwIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { SkillsEditor } from '@/components/profile/SkillsEditor'
import { ExperienceList } from '@/components/profile/ExperienceList'
import { EducationList } from '@/components/profile/EducationList'
import { ProcessingStatus } from '@/components/resume/ProcessingStatus'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [profileRes, skillsRes, experiencesRes, educationsRes, uploadRes] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase
        .from('skills')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('experiences')
        .select('*')
        .eq('user_id', user.id)
        .order('is_current', { ascending: false })
        .order('start_date', { ascending: false }),
      supabase
        .from('educations')
        .select('*')
        .eq('user_id', user.id)
        .order('end_year', { ascending: false }),
      supabase
        .from('resume_uploads')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_current', true)
        .single(),
    ])

  const profile = profileRes.data
  if (!profile) redirect('/upload')

  const skills = skillsRes.data ?? []
  const experiences = experiencesRes.data ?? []
  const educations = educationsRes.data ?? []
  const currentUpload = uploadRes.data

  return (
    <div className="space-y-6">
      {/* Profile header card */}
      <ProfileHeader
        profile={profile}
        email={user.email}
        phone={user.phone}
      />

      {/* Resume card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileTextIcon className="h-4 w-4" />
            Resume
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentUpload ? (
            <div className="space-y-3">
              <ProcessingStatus
                status={currentUpload.status}
                uploadedAt={currentUpload.created_at}
              />
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" asChild>
                  <a href={`/api/resume/download/${currentUpload.id}`}>
                    <DownloadIcon className="h-3.5 w-3.5" />
                    Download
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/upload">
                    <RefreshCwIcon className="h-3.5 w-3.5" />
                    Replace
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {currentUpload.original_filename}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <p className="text-sm text-muted-foreground">
                No resume uploaded yet.
              </p>
              <Button size="sm" asChild>
                <Link href="/upload">Upload Resume</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <SkillsEditor skills={skills} userId={user.id} />
        </CardContent>
      </Card>

      {/* Experience */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Work Experience</CardTitle>
        </CardHeader>
        <CardContent>
          <ExperienceList experiences={experiences} editable />
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Education</CardTitle>
        </CardHeader>
        <CardContent>
          <EducationList educations={educations} editable />
        </CardContent>
      </Card>

      {/* Summary */}
      {profile.summary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {profile.summary}
            </p>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Bottom padding for mobile */}
      <div className="h-4" />
    </div>
  )
}
