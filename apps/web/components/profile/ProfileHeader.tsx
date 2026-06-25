import Link from 'next/link'
import { PencilIcon, GithubIcon, LinkedinIcon, GlobeIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CompletionRing } from './CompletionRing'
import { getInitials } from '@/lib/utils'
import type { ProfileRow } from '@/types/database'

const AVAILABILITY_LABELS = {
  open: 'Open to opportunities',
  not_looking: 'Not looking',
  open_to_offers: 'Open to offers',
} as const

const AVAILABILITY_VARIANTS = {
  open: 'success',
  not_looking: 'secondary',
  open_to_offers: 'warning',
} as const

interface ProfileHeaderProps {
  profile: ProfileRow
  email?: string | null
  phone?: string | null
}

export function ProfileHeader({ profile, email, phone }: ProfileHeaderProps) {
  const displayName = profile.full_name ?? email ?? phone ?? 'Anonymous'
  const availLabel = AVAILABILITY_LABELS[profile.availability_status]
  const availVariant = AVAILABILITY_VARIANTS[profile.availability_status]

  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        {/* Avatar + completion ring */}
        <div className="relative">
          <Avatar className="h-16 w-16 border-2 border-background shadow">
            <AvatarImage src={profile.avatar_url ?? undefined} alt={displayName} />
            <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">
              {getInitials(profile.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-2 -right-3">
            <CompletionRing pct={profile.completion_pct} size={44} strokeWidth={4} />
          </div>
        </div>

        {/* Edit button */}
        <Button variant="outline" size="sm" asChild>
          <Link href="/profile/edit">
            <PencilIcon className="h-3.5 w-3.5" />
            Edit
          </Link>
        </Button>
      </div>

      {/* Name + headline */}
      <div className="mt-5 space-y-1">
        <h1 className="text-xl font-bold text-foreground">
          {profile.full_name ?? (
            <span className="text-muted-foreground italic">Add your name</span>
          )}
        </h1>
        {profile.headline ? (
          <p className="text-sm text-muted-foreground">{profile.headline}</p>
        ) : (
          <p className="text-sm text-muted-foreground/50 italic">Add a headline</p>
        )}
      </div>

      {/* Location + availability */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {profile.city && (
          <span className="text-xs text-muted-foreground">📍 {profile.city}</span>
        )}
        <Badge variant={availVariant as 'success' | 'secondary' | 'warning'} className="text-xs">
          {availLabel}
        </Badge>
      </div>

      {/* Social links */}
      {(profile.linkedin_url || profile.github_url || profile.portfolio_url) && (
        <div className="mt-4 flex items-center gap-3">
          {profile.linkedin_url && (
            <a
              href={profile.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-[#0077b5] transition-colors"
              aria-label="LinkedIn"
            >
              <LinkedinIcon className="h-5 w-5" />
            </a>
          )}
          {profile.github_url && (
            <a
              href={profile.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="GitHub"
            >
              <GithubIcon className="h-5 w-5" />
            </a>
          )}
          {profile.portfolio_url && (
            <a
              href={profile.portfolio_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Portfolio"
            >
              <GlobeIcon className="h-5 w-5" />
            </a>
          )}
        </div>
      )}

      {/* Completion nudge */}
      {profile.completion_pct < 80 && (
        <div className="mt-4 rounded-lg bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground flex items-center justify-between">
          <span>Profile {profile.completion_pct}% complete — add more to get noticed</span>
          <Link href="/profile/edit" className="text-primary hover:underline font-medium">
            Complete →
          </Link>
        </div>
      )}
    </div>
  )
}
