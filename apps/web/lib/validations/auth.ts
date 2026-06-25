import { z } from 'zod'

export const phoneSchema = z
  .string()
  .min(10, 'Enter a 10-digit mobile number')
  .max(10, 'Enter a 10-digit mobile number')
  .regex(/^\d{10}$/, 'Enter a valid 10-digit mobile number')

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Enter a valid email address')

export const sendOtpSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('phone'), value: phoneSchema }),
  z.object({ type: z.literal('email'), value: emailSchema }),
])

export const verifyOtpSchema = z.object({
  type: z.enum(['phone', 'email']),
  value: z.string().min(1),
  token: z
    .string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must be 6 digits'),
})

export type SendOtpInput = z.infer<typeof sendOtpSchema>
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>
