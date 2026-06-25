'use client'

import { motion } from 'framer-motion'
import { CheckCircle2Icon, ClockIcon, Loader2Icon, XCircleIcon } from 'lucide-react'
import type { UploadStatus } from '@/types/database'

interface ProcessingStatusProps {
  status: UploadStatus
  uploadedAt?: string
}

const CONFIG = {
  pending:    { icon: ClockIcon,        color: 'text-amber-500',  bg: 'bg-amber-50',   label: 'Queued for analysis' },
  uploaded:   { icon: Loader2Icon,      color: 'text-indigo-500', bg: 'bg-indigo-50',  label: 'Analysing your resume…' },
  processing: { icon: Loader2Icon,      color: 'text-indigo-500', bg: 'bg-indigo-50',  label: 'Extracting skills & experience…' },
  processed:  { icon: CheckCircle2Icon, color: 'text-emerald-600',bg: 'bg-emerald-50', label: 'Profile enhanced by AI' },
  failed:     { icon: XCircleIcon,      color: 'text-red-500',    bg: 'bg-red-50',     label: 'Processing failed — we\'ll retry' },
} satisfies Record<UploadStatus, { icon: React.FC<React.SVGProps<SVGSVGElement>>; color: string; bg: string; label: string }>

export function ProcessingStatus({ status, uploadedAt }: ProcessingStatusProps) {
  const { icon: Icon, color, bg, label } = CONFIG[status]
  const isSpinning = status === 'uploaded' || status === 'processing'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 ${bg}`}
    >
      <Icon
        className={`h-5 w-5 shrink-0 ${color} ${isSpinning ? 'animate-spin' : ''}`}
      />
      <div>
        <p className={`text-sm font-medium ${color}`}>{label}</p>
        {uploadedAt && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Uploaded {new Date(uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </p>
        )}
      </div>
    </motion.div>
  )
}
