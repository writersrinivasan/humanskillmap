export function HSMLogo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="hsm-bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2D6A4F" />
          <stop offset="100%" stopColor="#1B4332" />
        </linearGradient>
        <linearGradient id="hsm-node-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#95D5B2" />
          <stop offset="100%" stopColor="#74C69D" />
        </linearGradient>
      </defs>

      {/* Rounded square background */}
      <rect width="40" height="40" rx="10" fill="url(#hsm-bg)" />

      {/* Connecting lines (drawn first, behind nodes) */}
      <line x1="20" y1="15" x2="12" y2="26" stroke="white" strokeWidth="1.2" strokeOpacity="0.35" strokeLinecap="round" />
      <line x1="20" y1="15" x2="28" y2="26" stroke="white" strokeWidth="1.2" strokeOpacity="0.35" strokeLinecap="round" />
      <line x1="12" y1="28" x2="28" y2="28" stroke="white" strokeWidth="1.2" strokeOpacity="0.35" strokeLinecap="round" />

      {/* Top node — primary/brightest */}
      <circle cx="20" cy="12" r="4" fill="url(#hsm-node-top)" />

      {/* Bottom-left node */}
      <circle cx="12" cy="28" r="3" fill="white" fillOpacity="0.55" />

      {/* Bottom-right node */}
      <circle cx="28" cy="28" r="3" fill="white" fillOpacity="0.55" />
    </svg>
  )
}
