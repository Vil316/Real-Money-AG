import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type PageShellProps = {
  children: ReactNode
  topSlot?: ReactNode
  className?: string
  contentClassName?: string
  edgeFades?: boolean
  ambientGlow?: boolean
}

export function PageShell({
  children,
  topSlot,
  className,
  contentClassName,
  edgeFades = true,
  ambientGlow = true,
}: PageShellProps) {
  return (
    <div className={cn('relative -mx-4 min-h-full overflow-x-hidden px-4 pb-8 pt-20 text-white', className)}>
      {ambientGlow ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(11,130,137,0.18),transparent_60%)]" />
          <div className="pointer-events-none absolute right-[-36px] top-16 h-32 w-32 rounded-full bg-[#6d90ff]/10 blur-3xl" />
        </>
      ) : null}

      {edgeFades ? (
        <>
          <div className="pointer-events-none fixed inset-x-0 top-0 z-30 h-24 bg-gradient-to-b from-[#090b0d] via-[#090b0d]/78 to-transparent" />
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-28 bg-gradient-to-t from-[#090b0d] via-[#090b0d]/82 to-transparent" />
        </>
      ) : null}

      {topSlot}

      <div className={cn('relative space-y-3', contentClassName)}>{children}</div>
    </div>
  )
}
