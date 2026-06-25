'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { validateResumeFile } from '@/lib/utils'

export type UploadPhase =
  | 'idle'
  | 'requesting'   // asking server for presigned URL
  | 'uploading'    // PUT to Supabase Storage
  | 'confirming'   // notifying server upload is done
  | 'done'
  | 'error'

interface UploadState {
  phase: UploadPhase
  progress: number            // 0-100
  uploadId: string | null
  filename: string | null
  error: string | null
}

export function useUpload() {
  const [state, setState] = useState<UploadState>({
    phase: 'idle',
    progress: 0,
    uploadId: null,
    filename: null,
    error: null,
  })

  const reset = useCallback(() => {
    setState({
      phase: 'idle',
      progress: 0,
      uploadId: null,
      filename: null,
      error: null,
    })
  }, [])

  const upload = useCallback(async (file: File) => {
    // Validate on client before touching the network
    const validationError = validateResumeFile(file)
    if (validationError) {
      toast.error(validationError)
      setState((s) => ({ ...s, phase: 'error', error: validationError }))
      return
    }

    setState({
      phase: 'requesting',
      progress: 5,
      uploadId: null,
      filename: file.name,
      error: null,
    })

    try {
      // Step 1: Request presigned URL from our API
      const initRes = await fetch('/api/resume/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          fileSize: file.size,
        }),
      })

      if (!initRes.ok) {
        const err = await initRes.json()
        throw new Error(err.error ?? 'Failed to initiate upload')
      }

      const { uploadId, signedUrl, token } = await initRes.json()

      setState((s) => ({ ...s, phase: 'uploading', progress: 15 }))

      // Step 2: PUT file directly to Supabase Storage (bypasses Vercel 4.5 MB limit)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 70) + 15 // 15→85
            setState((s) => ({ ...s, progress: pct }))
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`Storage upload failed: ${xhr.status}`))
          }
        })

        xhr.addEventListener('error', () => reject(new Error('Network error during upload')))

        xhr.open('PUT', signedUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        }
        xhr.send(file)
      })

      setState((s) => ({ ...s, phase: 'confirming', progress: 90 }))

      // Step 3: Confirm upload to update DB status
      const confirmRes = await fetch('/api/resume/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId }),
      })

      if (!confirmRes.ok) {
        const err = await confirmRes.json()
        throw new Error(err.error ?? 'Failed to confirm upload')
      }

      setState((s) => ({
        ...s,
        phase: 'done',
        progress: 100,
        uploadId,
      }))

      toast.success('Resume uploaded! Analyzing your profile…')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      console.error('[useUpload]', err)
      toast.error(message)
      setState((s) => ({ ...s, phase: 'error', error: message, progress: 0 }))
    }
  }, [])

  return { ...state, upload, reset }
}
