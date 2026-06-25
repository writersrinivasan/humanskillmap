'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon, XIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addSkillSchema, type AddSkillInput } from '@/lib/validations/profile'
import type { SkillRow } from '@/types/database'

interface SkillsEditorProps {
  skills: SkillRow[]
  userId: string
}

const PROFICIENCY_COLORS = {
  beginner:     'bg-slate-100 text-slate-700',
  intermediate: 'bg-blue-100 text-blue-700',
  advanced:     'bg-indigo-100 text-indigo-700',
  expert:       'bg-violet-100 text-violet-700',
} as const

export function SkillsEditor({ skills: initialSkills }: SkillsEditorProps) {
  const router = useRouter()
  const [skills, setSkills] = useState(initialSkills)
  const [isAdding, setIsAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddSkillInput>({
    resolver: zodResolver(addSkillSchema),
  })

  async function onAdd(data: AddSkillInput) {
    setIsAdding(true)
    try {
      const res = await fetch('/api/profile/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setSkills((prev) => [...prev, json.skill])
      reset()
      setShowForm(false)
      toast.success(`Added ${data.skill_name}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add skill')
    } finally {
      setIsAdding(false)
    }
  }

  async function onDelete(skillId: string, skillName: string) {
    setDeletingId(skillId)
    try {
      const res = await fetch(`/api/profile/skills/${skillId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setSkills((prev) => prev.filter((s) => s.id !== skillId))
      toast.success(`Removed ${skillName}`)
      router.refresh()
    } catch {
      toast.error('Failed to remove skill')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Skill chips */}
      {skills.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className={`group inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                skill.proficiency
                  ? PROFICIENCY_COLORS[skill.proficiency]
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <span>{skill.skill_name}</span>
              {skill.proficiency && (
                <span className="opacity-60">· {skill.proficiency}</span>
              )}
              <button
                onClick={() => onDelete(skill.id, skill.skill_name)}
                disabled={deletingId === skill.id}
                className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                aria-label={`Remove ${skill.skill_name}`}
              >
                {deletingId === skill.id ? (
                  <Loader2Icon className="h-3 w-3 animate-spin" />
                ) : (
                  <XIcon className="h-3 w-3" />
                )}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          No skills added yet. Add your first skill below.
        </p>
      )}

      {/* Add skill form */}
      {showForm ? (
        <form onSubmit={handleSubmit(onAdd)} className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="skill_name" className="sr-only">Skill name</Label>
              <Input
                id="skill_name"
                placeholder="e.g. React, Python, SQL…"
                autoFocus
                {...register('skill_name')}
              />
              {errors.skill_name && (
                <p className="text-xs text-destructive">{errors.skill_name.message}</p>
              )}
            </div>

            <select
              {...register('proficiency')}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Level</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isAdding}>
              {isAdding ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : 'Add'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setShowForm(false); reset() }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(true)}
          className="gap-1.5"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Add skill
        </Button>
      )}
    </div>
  )
}
