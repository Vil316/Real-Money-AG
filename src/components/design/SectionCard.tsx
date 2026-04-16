import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type SectionCardProps = {
  children: ReactNode
  className?: string
}

export function SectionCard({ children, className }: SectionCardProps) {
  return (
    <section
      className={cn(
        'rounded-[28px] border border-white/[0.06] bg-[#121518] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.3)]',
        className,
      )}
    >
      {children}
    </section>
  )
}
