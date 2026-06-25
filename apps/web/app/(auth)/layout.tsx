import type { Metadata } from 'next'
import { HSMLogo } from '@/components/ui/HSMLogo'

export const metadata: Metadata = {
  title: 'Sign In',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5EFE4] via-[#FAF7F0] to-[#EEF5F0] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <HSMLogo size={52} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">HumanSkillMap</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Get discovered by top recruiters
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border bg-card shadow-lg shadow-stone-200/60 p-6 sm:p-8">
          {children}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
