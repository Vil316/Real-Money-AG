import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type OnboardingShellProps = {
  header: ReactNode
  children: ReactNode
  footer: ReactNode
  className?: string
}

export function OnboardingShell({ header, children, footer, className }: OnboardingShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070b10] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,#101a23_0%,#0a1016_48%,#070b10_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_10%,rgba(126,222,233,0.14),transparent_44%),radial-gradient(circle_at_90%_12%,rgba(237,192,125,0.12),transparent_38%),radial-gradient(circle_at_50%_100%,rgba(56,88,110,0.28),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-white/[0.03] to-transparent" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-4 pt-[max(env(safe-area-inset-top),1.15rem)]">
        {header}
        <main className={cn('flex-1 pb-28 pt-5', className)}>{children}</main>
        {footer}
      </div>
    </div>
  )
}