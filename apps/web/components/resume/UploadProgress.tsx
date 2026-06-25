'use client'

import { motion } from 'framer-motion'
import { FileTextIcon, XIcon } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { formatFileSize } from '@/lib/utils'
import type { UploadPhase } from '@/hooks/useUpload'

const PHASE_LABELS: Record<UploadPhase, string> = {
  idle: '',
  requesting: 'Preparing secure upload…',
  uploading: 'Uploading your resume…',
  confirming: 'Finalising…',
  done: 'Upload complete!',
  error: 'Upload failed',
}

interface UploadProgressProps {
  filename: string
  fileSize?: number
  phase: UploadPhase
  progress: number
  onCancel?: () => void
}

export function UploadProgress({
  filename,
  fileSize,
  phase,
  progress,
  onCancel,
}: UploadProgressProps) {
  const isDone = phase === 'done'
  const isError = phase === 'error'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-xl border bg-card p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className={`rounded-lg p-2 ${isDone ? 'bg-emerald-100' : isError ? 'bg-red-100' : 'bg-primary/10'}`}>
          <FileTextIcon
            className={`h-5 w-5 ${isDone ? 'text-emerald-600' : isError ? 'text-red-600' : 'text-primary'}`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{filename}</p>
          {fileSize && (
            <p className="text-xs text-muted-foreground">{formatFileSize(fileSize)}</p>
          )}
        </div>

        {!isDone && onCancel && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={onCancel}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Progress value={progress} className="h-1.5" />

      <p
        className={`text-xs ${
          isDone
            ? 'text-emerald-600 font-medium'
            : isError
            ? 'text-destructive'
            : 'text-muted-foreground'
        }`}
      >
        {PHASE_LABELS[phase]}
        {phase === 'uploading' && ` ${progress}%`}
      </p>
    </motion.div>
  )
}
