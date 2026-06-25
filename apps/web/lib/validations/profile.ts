import { z } from 'zod'

export const profileUpdateSchema = z.object({
  full_name: z.string().max(120).optional(),
  headline: z.string().max(160).optional(),
  summary: z.string().max(2000).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  linkedin_url: z.string().url('Enter a valid LinkedIn URL').optional().or(z.literal('')),
  github_url: z.string().url('Enter a valid GitHub URL').optional().or(z.literal('')),
  portfolio_url: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  salary_exp_min: z.number().int().min(0).max(9999999).optional().nullable(),
  salary_exp_max: z.number().int().min(0).max(9999999).optional().nullable(),
  notice_period_days: z.number().int().min(0).max(365).optional().nullable(),
  availability_status: z
    .enum(['open', 'not_looking', 'open_to_offers'])
    .optional(),
})

export const addSkillSchema = z.object({
  skill_name: z.string().min(1, 'Skill name is required').max(80),
  skill_type: z
    .enum(['technical', 'soft', 'domain', 'tool', 'language'])
    .optional(),
  proficiency: z
    .enum(['beginner', 'intermediate', 'advanced', 'expert'])
    .optional(),
  years_exp: z.number().min(0).max(50).optional().nullable(),
})

export const addExperienceSchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(120),
  role_title: z.string().min(1, 'Role is required').max(120),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  is_current: z.boolean().default(false),
  description: z.string().max(2000).optional(),
  tech_stack: z.array(z.string().max(80)).max(20).optional(),
  city: z.string().max(80).optional(),
})

export const addEducationSchema = z.object({
  institution: z.string().min(1, 'Institution is required').max(200),
  degree: z.string().max(120).optional(),
  field_of_study: z.string().max(120).optional(),
  start_year: z.number().int().min(1950).max(2030).optional().nullable(),
  end_year: z.number().int().min(1950).max(2035).optional().nullable(),
  grade: z.string().max(20).optional(),
})

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
export type AddSkillInput = z.infer<typeof addSkillSchema>
export type AddExperienceInput = z.infer<typeof addExperienceSchema>
export type AddEducationInput = z.infer<typeof addEducationSchema>
