import Link from 'next/link'
import { GraduationCapIcon, PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { EducationRow } from '@/types/database'

interface EducationListProps {
  educations: EducationRow[]
  editable?: boolean
}

export function EducationList({ educations, editable = false }: EducationListProps) {
  if (educations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <GraduationCapIcon className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No education added yet.</p>
        {editable && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/profile/edit#education">
              <PlusIcon className="h-3.5 w-3.5" />
              Add education
            </Link>
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {educations.map((edu) => (
        <div key={edu.id} className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <GraduationCapIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm text-foreground">{edu.institution}</p>
            {(edu.degree || edu.field_of_study) && (
              <p className="text-sm text-muted-foreground">
                {[edu.degree, edu.field_of_study].filter(Boolean).join(' · ')}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {edu.start_year && `${edu.start_year}`}
              {edu.start_year && edu.end_year && ' – '}
              {edu.end_year && `${edu.end_year}`}
              {edu.grade && ` · ${edu.grade}`}
            </p>
          </div>
        </div>
      ))}

      {editable && (
        <Button variant="outline" size="sm" asChild className="w-full">
          <Link href="/profile/edit#education">
            <PlusIcon className="h-3.5 w-3.5" />
            Add more education
          </Link>
        </Button>
      )}
    </div>
  )
}
