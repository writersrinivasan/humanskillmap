import { z } from 'zod'

export const uploadInitSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.enum([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]),
  fileSize: z
    .number()
    .int()
    .min(1)
    .max(10 * 1024 * 1024, 'File must be under 10 MB'),
})

export const uploadCompleteSchema = z.object({
  uploadId: z.string().uuid(),
})

export type UploadInitInput = z.infer<typeof uploadInitSchema>
export type UploadCompleteInput = z.infer<typeof uploadCompleteSchema>
