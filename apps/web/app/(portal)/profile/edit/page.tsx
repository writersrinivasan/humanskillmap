'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2Icon, SaveIcon } from 'lucide-react'
import { toast } from 'sonner'

import { profileUpdateSchema, type ProfileUpdateInput } from '@/lib/validations/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function EditProfilePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
  })

  // Load current profile
  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          reset({
            full_name: data.profile.full_name ?? '',
            headline: data.profile.headline ?? '',
            summary: data.profile.summary ?? '',
            city: data.profile.city ?? '',
            state: data.profile.state ?? '',
            country: data.profile.country ?? 'India',
            linkedin_url: data.profile.linkedin_url ?? '',
            github_url: data.profile.github_url ?? '',
            portfolio_url: data.profile.portfolio_url ?? '',
            notice_period_days: data.profile.notice_period_days ?? undefined,
            availability_status: data.profile.availability_status ?? 'open',
          })
        }
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [reset])

  async function onSubmit(data: ProfileUpdateInput) {
    setIsSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Profile saved!')
      router.push('/profile')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Edit Profile</h1>
        <Button type="submit" disabled={isSaving || !isDirty} size="sm">
          {isSaving ? (
            <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <SaveIcon className="h-3.5 w-3.5" />
          )}
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" placeholder="Rahul Kumar" {...register('full_name')} />
              {errors.full_name && (
                <p className="text-xs text-destructive">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                placeholder="Senior React Developer at Infosys"
                {...register('headline')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="summary">About / Summary</Label>
            <Textarea
              id="summary"
              placeholder="Tell recruiters about yourself…"
              rows={4}
              {...register('summary')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" placeholder="Chennai" {...register('city')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Input id="state" placeholder="Tamil Nadu" {...register('state')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <Input id="country" placeholder="India" {...register('country')} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Preferences */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Job Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="availability_status">Availability</Label>
              <select
                id="availability_status"
                {...register('availability_status')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="open">Open to opportunities</option>
                <option value="open_to_offers">Open to offers</option>
                <option value="not_looking">Not looking</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notice_period_days">Notice Period (days)</Label>
              <Input
                id="notice_period_days"
                type="number"
                placeholder="30"
                min={0}
                max={365}
                {...register('notice_period_days', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="salary_exp_min">Expected Salary Min (₹K/mo)</Label>
              <Input
                id="salary_exp_min"
                type="number"
                placeholder="50"
                {...register('salary_exp_min', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salary_exp_max">Expected Salary Max (₹K/mo)</Label>
              <Input
                id="salary_exp_max"
                type="number"
                placeholder="80"
                {...register('salary_exp_max', { valueAsNumber: true })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Social & Portfolio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="linkedin_url">LinkedIn</Label>
            <Input
              id="linkedin_url"
              type="url"
              placeholder="https://linkedin.com/in/yourprofile"
              {...register('linkedin_url')}
            />
            {errors.linkedin_url && (
              <p className="text-xs text-destructive">{errors.linkedin_url.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="github_url">GitHub</Label>
            <Input
              id="github_url"
              type="url"
              placeholder="https://github.com/yourusername"
              {...register('github_url')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="portfolio_url">Portfolio / Website</Label>
            <Input
              id="portfolio_url"
              type="url"
              placeholder="https://yourwebsite.com"
              {...register('portfolio_url')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bottom save button (mobile) */}
      <Button type="submit" size="lg" className="w-full" disabled={isSaving || !isDirty}>
        {isSaving ? (
          <Loader2Icon className="animate-spin" />
        ) : (
          <SaveIcon />
        )}
        {isSaving ? 'Saving…' : 'Save Changes'}
      </Button>
    </form>
  )
}
