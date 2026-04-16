import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type SummaryTone = 'teal' | 'neutral' | 'danger'

type SummaryMetric = {
  label: string
  value: ReactNode
}

type SummaryCardProps = {
  eyebrow: string
  eyebrowIcon?: ReactNode
  status?: string
  value: ReactNode
  metrics?: SummaryMetric[]
  footer?: ReactNode
  tone?: SummaryTone
  className?: string
}

function getStatusClass(tone: SummaryTone): string {
  switch (tone) {
    case 'danger':
      return 'border-[#d67a7a]/24 bg-[#d67a7a]/10 text-[#e2a6a6]'
    case 'neutral':
      return 'border-white/[0.1] bg-white/[0.04] text-white/62'
    default:
      return 'border-[#0B8289]/14 bg-[#0B8289]/8 text-[#87d8df]/90'
  }
}

export function SummaryCard({
  eyebrow,
  eyebrowIcon,
  status,
  value,
  metrics = [],
  footer,
  tone = 'teal',
  className,
}: SummaryCardProps) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-[30px] border border-white/[0.06] bg-[#101316] px-5 pb-5 pt-4 shadow-[0_24px_70px_rgba(0,0,0,0.42)]',
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#73dbe1]">
          {eyebrowIcon}
          <span>{eyebrow}</span>
        </div>

        {status ? (
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em]',
              getStatusClass(tone),
            )}
          >
            {status}
          </span>
        ) : null}
      </div>

      <div className="mb-5">
        <div className="text-[44px] font-semibold leading-none tracking-[-1.4px] text-white">{value}</div>
      </div>

      {metrics.length > 0 ? (
        <div className="space-y-3 rounded-[22px] border border-white/[0.05] bg-white/[0.03] p-4">
          {metrics.map((metric, index) => (
            <div
              key={`${metric.label}-${index}`}
              className={cn(
                'flex items-center justify-between text-[13px] text-white/68',
                index === metrics.length - 1 && 'border-t border-white/[0.06] pt-3',
              )}
            >
              <span>{metric.label}</span>
              <span className="font-medium text-white">{metric.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      {footer ? (
        <div className="mt-5 flex items-center gap-2 border-t border-white/[0.06] pt-4 text-[13px] font-medium text-[#9fd9dc]">
          <Sparkles size={14} strokeWidth={2.1} />
          <span>{footer}</span>
        </div>
      ) : null}
    </section>
  )
}
