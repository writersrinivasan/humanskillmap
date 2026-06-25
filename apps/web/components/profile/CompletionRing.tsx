'use client'

import { motion } from 'framer-motion'

interface CompletionRingProps {
  pct: number
  size?: number
  strokeWidth?: number
}

export function CompletionRing({ pct, size = 72, strokeWidth = 6 }: CompletionRingProps) {
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (pct / 100) * circumference

  const color =
    pct >= 80 ? '#10b981' : pct >= 50 ? '#6366f1' : '#f59e0b'

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(214 32% 91%)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      {/* Percentage label */}
      <span
        className="absolute text-sm font-bold tabular-nums"
        style={{ color }}
      >
        {pct}%
      </span>
    </div>
  )
}
