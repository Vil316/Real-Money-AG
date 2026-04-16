import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type PremiumRowTone = 'neutral' | 'income' | 'expense' | 'attention' | 'success'

type PremiumListRowProps = {
  title: string
  subtitle?: string
  amount?: string
  tone?: PremiumRowTone
  leading?: ReactNode
  trailing?: ReactNode
  onClick?: () => void
  className?: string
}

function getDotClass(tone: PremiumRowTone): string {
  switch (tone) {
    case 'income':
      return 'bg-[#74d4a3]/88'
    case 'attention':
      return 'bg-[#d6b27a]/88'
    case 'success':
      return 'bg-[#8fd9ae]/88'
    default:
      return 'bg-[#73dbe1]/75'
  }
}

function getAmountClass(tone: PremiumRowTone): string {
  switch (tone) {
    case 'income':
      return 'text-[#9ddfbe]'
    case 'expense':
      return 'text-white/92'
    case 'attention':
      return 'text-[#dfc095]'
    case 'success':
      return 'text-[#a4e2c4]'
    default:
      return 'text-white/92'
  }
}

function Content({
  title,
  subtitle,
  amount,
  tone,
  leading,
  trailing,
}: Omit<PremiumListRowProps, 'onClick' | 'className'>) {
  return (
    <>
      <div className="flex min-w-0 items-center gap-2.5">
        {leading ? (
          <span className="shrink-0">{leading}</span>
        ) : (
          <span className={cn('h-2 w-2 shrink-0 rounded-full', getDotClass(tone ?? 'neutral'))} />
        )}

        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-white/96">{title}</p>
          {subtitle ? <p className="mt-0.5 text-[11px] text-white/48">{subtitle}</p> : null}
        </div>
      </div>

      <div className="ml-3 flex shrink-0 items-center gap-2">
        {amount ? (
          <span className={cn('text-right text-[14px] font-semibold tabular-nums', getAmountClass(tone ?? 'neutral'))}>
            {amount}
          </span>
        ) : null}
        {trailing ?? <ChevronRight size={16} className="text-white/28" />}
      </div>
    </>
  )
}

export function PremiumListRow({
  title,
  subtitle,
  amount,
  tone = 'neutral',
  leading,
  trailing,
  onClick,
  className,
}: PremiumListRowProps) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex w-full items-center justify-between gap-3 py-3.5 text-left first:pt-1 last:pb-1 active:scale-[0.995]',
          className,
        )}
      >
        <Content
          title={title}
          subtitle={subtitle}
          amount={amount}
          tone={tone}
          leading={leading}
          trailing={trailing}
        />
      </button>
    )
  }

  return (
    <div className={cn('flex w-full items-center justify-between gap-3 py-3.5 first:pt-1 last:pb-1', className)}>
      <Content
        title={title}
        subtitle={subtitle}
        amount={amount}
        tone={tone}
        leading={leading}
        trailing={trailing}
      />
    </div>
  )
}
