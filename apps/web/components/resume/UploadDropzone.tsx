'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
import { UploadCloudIcon, FileTextIcon, AlertCircleIcon } from 'lucide-react'
import { cn, ALLOWED_EXTENSIONS, MAX_FILE_SIZE, formatFileSize } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
}

export function UploadDropzone({ onFileSelect, disabled }: UploadDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: unknown[]) => {
      if (rejectedFiles && (rejectedFiles as []).length > 0) return
      if (acceptedFiles[0]) {
        onFileSelect(acceptedFiles[0])
      }
    },
    [onFileSelect]
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: MAX_FILE_SIZE,
    maxFiles: 1,
    disabled,
  })

  return (
    <div className="w-full space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 cursor-pointer select-none',
          isDragActive && !isDragReject
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : isDragReject
            ? 'border-destructive bg-destructive/5'
            : disabled
            ? 'border-border bg-muted/30 cursor-not-allowed opacity-60'
            : 'border-border bg-muted/20 hover:border-primary/50 hover:bg-primary/5'
        )}
      >
        <input {...getInputProps()} />

        <motion.div
          animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="mb-4"
        >
          {isDragReject ? (
            <AlertCircleIcon className="h-12 w-12 text-destructive" />
          ) : isDragActive ? (
            <UploadCloudIcon className="h-12 w-12 text-primary" />
          ) : (
            <FileTextIcon className="h-12 w-12 text-muted-foreground" />
          )}
        </motion.div>

        {isDragReject ? (
          <p className="font-medium text-destructive">That file type isn't supported.</p>
        ) : isDragActive ? (
          <p className="font-medium text-primary">Drop it here!</p>
        ) : (
          <>
            <p className="font-medium text-foreground">
              Drag & drop your resume here
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or tap to browse your files
            </p>
          </>
        )}

        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          {ALLOWED_EXTENSIONS.map((ext) => (
            <span
              key={ext}
              className="rounded border px-1.5 py-0.5 font-mono uppercase"
            >
              {ext.slice(1)}
            </span>
          ))}
          <span>·</span>
          <span>Max {formatFileSize(MAX_FILE_SIZE)}</span>
        </div>
      </div>

      {/* OR divider + button fallback */}
      {!isDragActive && (
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 border-t" />
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        disabled={disabled}
        onClick={() =>
          document.querySelector<HTMLInputElement>('input[type="file"]')?.click()
        }
      >
        <UploadCloudIcon className="h-4 w-4" />
        Choose File
      </Button>
    </div>
  )
}
