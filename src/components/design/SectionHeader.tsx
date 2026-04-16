import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type SectionHeaderProps = {
  title: ReactNode
  subtitle?: ReactNode
  right?: ReactNode
  className?: string
}

export function SectionHeader({ title, subtitle, right, className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-3', className)}>
      <div>
        <h2 className="text-[17px] font-semibold text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-[12px] text-white/45">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  )
}
