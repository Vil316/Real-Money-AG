import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type EmptyStateCardProps = {
  title: string
  description: string
  icon?: ReactNode
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyStateCard({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className,
}: EmptyStateCardProps) {
  return (
    <div
      className={cn(
        'rounded-[22px] border border-dashed border-white/[0.14] bg-white/[0.02] px-4 py-6 text-center',
        className,
      )}
    >
      {icon ? <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05] text-white/75">{icon}</div> : null}
      <p className="text-[15px] font-semibold text-white/94">{title}</p>
      <p className="mx-auto mt-1 max-w-[260px] text-[13px] text-white/48">{description}</p>

      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-full border border-[#0B8289]/24 bg-[#0B8289]/12 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#97dde1]"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
