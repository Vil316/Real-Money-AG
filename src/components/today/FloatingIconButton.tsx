import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

type FloatingIconButtonProps = {
  children: ReactNode
  onClick?: () => void
  className?: string
  glowPulse?: boolean
  nudge?: boolean
  ariaLabel?: string
}

export function FloatingIconButton({
  children,
  onClick,
  className,
  glowPulse = false,
  nudge = false,
  ariaLabel,
}: FloatingIconButtonProps) {
  const prefersReducedMotion = useReducedMotion()
  const shouldNudge = !prefersReducedMotion && nudge

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        'relative flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-[#15181c] text-white shadow-[0_12px_30px_rgba(0,0,0,0.28)] transition-colors',
        className,
      )}
      whileTap={prefersReducedMotion ? { opacity: 0.88 } : { scale: 0.94 }}
      transition={{
        type: 'spring',
        stiffness: 360,
        damping: 24,
        mass: 0.8,
        ...(shouldNudge
          ? {
              x: {
                duration: 0.42,
                ease: 'easeInOut',
                repeat: Infinity,
                repeatDelay: 6.8,
              },
            }
          : {}),
      }}
      animate={
        !shouldNudge
          ? undefined
          : {
              x: [0, -1.5, 1.5, 0],
            }
      }
    >
      {children}
      {glowPulse && (
        <motion.span
          className="pointer-events-none absolute inset-0 rounded-full"
          animate={
            prefersReducedMotion
              ? { opacity: 0.2 }
              : {
                  opacity: [0.18, 0.34, 0.18],
                  boxShadow: [
                    '0 0 0 rgba(11,130,137,0.0)',
                    '0 0 24px rgba(11,130,137,0.42)',
                    '0 0 0 rgba(11,130,137,0.0)',
                  ],
                }
          }
          transition={{ duration: 2.6, ease: 'easeInOut', repeat: Infinity }}
        />
      )}
    </motion.button>
  )
}