import React from 'react'
import { cn } from '@/lib/utils'

export function PageHeader({ title, subtitle, right, className }: { title: string | React.ReactNode, subtitle?: string | React.ReactNode, right?: React.ReactNode, className?: string }) {
  return (
    <div className={cn("flex flex-col mb-6 mt-2", className)}>
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-[28px] font-display font-semibold -tracking-[0.5px] text-white leading-tight">
            {title}
          </h1>
          {subtitle && (
             <div className="text-glass-secondary text-[15px] mt-1">{subtitle}</div>
          )}
        </div>
        {right && <div>{right}</div>}
      </div>
    </div>
  )
}
