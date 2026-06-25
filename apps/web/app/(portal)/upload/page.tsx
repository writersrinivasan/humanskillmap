'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRightIcon, CheckCircle2Icon } from 'lucide-react'

import { UploadDropzone } from '@/components/resume/UploadDropzone'
import { UploadProgress } from '@/components/resume/UploadProgress'
import { Button } from '@/components/ui/button'
import { useUpload } from '@/hooks/useUpload'

export default function UploadPage() {
  const router = useRouter()
  const { phase, progress, uploadId, filename, error, upload, reset } = useUpload()

  // Auto-navigate to profile after upload completes
  useEffect(() => {
    if (phase === 'done' && uploadId) {
      const timer = setTimeout(() => {
        router.push('/profile')
        router.refresh()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [phase, uploadId, router])

  const isUploading = ['requesting', 'uploading', 'confirming'].includes(phase)
  const isDone = phase === 'done'

  return (
    <div className="mx-auto max-w-lg">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Step 2 of 2
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Upload your resume
          </h1>
          <p className="text-muted-foreground">
            We'll extract your skills and experience automatically.
          </p>
        </div>

        {/* Upload area */}
        {phase === 'idle' || phase === 'error' ? (
          <div className="space-y-4">
            <UploadDropzone onFileSelect={upload} />
            {phase === 'error' && error && (
              <p className="text-center text-sm text-destructive">{error}</p>
            )}
          </div>
        ) : isDone ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 py-8 text-center"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2Icon className="h-10 w-10 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Resume uploaded!
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                We're analysing your resume. Your profile will be ready in about
                2 minutes.
              </p>
            </div>
            <Button asChild size="lg" className="mt-2">
              <Link href="/profile">
                View Profile
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        ) : (
          filename && (
            <UploadProgress
              filename={filename}
              phase={phase}
              progress={progress}
              onCancel={isUploading ? undefined : reset}
            />
          )
        )}

        {/* Skip link */}
        {(phase === 'idle' || phase === 'error') && (
          <p className="text-center text-sm text-muted-foreground">
            Already have a resume uploaded?{' '}
            <Link href="/profile" className="text-primary hover:underline">
              Go to your profile →
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  )
}
