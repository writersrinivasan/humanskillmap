import Link from 'next/link'
import { DownloadIcon, ExternalLinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatDate, getInitials } from '@/lib/utils'
import type { UploadStatus } from '@/types/database'

const STATUS_VARIANT: Record<UploadStatus, string> = {
  pending:    'bg-amber-100 text-amber-700',
  uploaded:   'bg-blue-100 text-blue-700',
  processing: 'bg-indigo-100 text-indigo-700',
  processed:  'bg-emerald-100 text-emerald-700',
  failed:     'bg-red-100 text-red-700',
}

interface UserWithProfile {
  id: string
  email: string | null
  phone: string | null
  profiles: { full_name: string | null; city: string | null } | null
}

interface UploadWithRelations {
  id: string
  original_filename: string
  status: UploadStatus
  created_at: string
  is_current: boolean
  users: UserWithProfile | null
}

interface CandidateTableProps {
  uploads: UploadWithRelations[]
  showDownload?: boolean
}

export function CandidateTable({ uploads, showDownload = false }: CandidateTableProps) {
  if (uploads.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No candidates yet.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Candidate
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
              Location
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Status
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
              Uploaded
            </th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {uploads.map((upload) => {
            const profile = upload.users?.profiles
            const name =
              profile?.full_name ??
              upload.users?.email ??
              upload.users?.phone ??
              'Anonymous'
            const contact = upload.users?.email ?? upload.users?.phone ?? ''

            return (
              <tr key={upload.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate max-w-[180px]">
                        {name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {contact}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  {profile?.city ?? '—'}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_VARIANT[upload.status]}`}
                  >
                    {upload.status}
                  </span>
                </td>

                <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                  {formatDate(upload.created_at)}
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {showDownload && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <a href={`/api/resume/download/${upload.id}`} title="Download resume">
                          <DownloadIcon className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                    {upload.users?.id && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <Link
                          href={`/admin/candidates/${upload.users.id}`}
                          title="View candidate"
                        >
                          <ExternalLinkIcon className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
