import Link from 'next/link'
import { BriefcaseIcon, PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatMonthYear } from '@/lib/utils'
import type { ExperienceRow } from '@/types/database'

interface ExperienceListProps {
  experiences: ExperienceRow[]
  editable?: boolean
}

export function ExperienceList({ experiences, editable = false }: ExperienceListProps) {
  if (experiences.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <BriefcaseIcon className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No work experience added yet.</p>
        {editable && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/profile/edit#experience">
              <PlusIcon className="h-3.5 w-3.5" />
              Add experience
            </Link>
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {experiences.map((exp, i) => (
        <div key={exp.id} className="flex gap-3">
          {/* Timeline dot */}
          <div className="flex flex-col items-center">
            <div className="mt-1 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
            {i < experiences.length - 1 && (
              <div className="mt-1 w-px flex-1 bg-border" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foreground text-sm">{exp.role_title}</p>
                <p className="text-sm text-muted-foreground">{exp.company_name}</p>
              </div>
              {exp.is_current && (
                <Badge variant="success" className="text-xs shrink-0">Current</Badge>
              )}
            </div>

            <p className="mt-0.5 text-xs text-muted-foreground">
              {exp.start_date ? formatMonthYear(exp.start_date) : '—'}
              {' → '}
              {exp.is_current ? 'Present' : exp.end_date ? formatMonthYear(exp.end_date) : '—'}
              {exp.city && ` · ${exp.city}`}
            </p>

            {exp.description && (
              <p className="mt-1.5 text-xs text-muted-foreground line-clamp-3">
                {exp.description}
              </p>
            )}

            {exp.tech_stack.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {exp.tech_stack.slice(0, 6).map((t) => (
                  <span
                    key={t}
                    className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {editable && (
        <Button variant="outline" size="sm" asChild className="w-full">
          <Link href="/profile/edit#experience">
            <PlusIcon className="h-3.5 w-3.5" />
            Add more experience
          </Link>
        </Button>
      )}
    </div>
  )
}
