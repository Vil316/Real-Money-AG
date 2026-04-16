import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type OnboardingShellProps = {
  header: ReactNode
  children: ReactNode
  footer: ReactNode
  className?: string
}

export function OnboardingShell({ header, children, footer, className }: OnboardingShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070b] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#0b1015_0%,#05070b_58%,#040507_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(108,226,240,0.11),transparent_42%),radial-gradient(circle_at_82%_14%,rgba(145,124,255,0.10),transparent_36%),radial-gradient(circle_at_50%_100%,rgba(42,74,95,0.28),transparent_46%)]" />

      <motion.div
        className="pointer-events-none absolute -inset-[20%]"
        style={{
          background:
            'radial-gradient(circle at 30% 26%, rgba(97,209,222,0.09), transparent 36%), radial-gradient(circle at 72% 24%, rgba(133,110,240,0.08), transparent 32%), radial-gradient(circle at 50% 86%, rgba(39,75,97,0.20), transparent 44%)',
        }}
        animate={{ x: [-10, 8, -10], y: [-6, 5, -6], opacity: [0.65, 0.8, 0.65] }}
        transition={{ duration: 24, ease: 'easeInOut', repeat: Infinity }}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-white/[0.04] to-transparent" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-4 pt-[max(env(safe-area-inset-top),1.25rem)]">
        {header}
        <main className={cn('flex-1 pb-28 pt-6', className)}>{children}</main>
        {footer}
      </div>
    </div>
  )
}