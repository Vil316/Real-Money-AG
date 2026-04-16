import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '@/lib/utils'

export type SheetAccentTone = 'neutral' | 'purple' | 'green' | 'red'

type SheetSectionProps = {
  label: string
  meta?: string
  children: ReactNode
  className?: string
}

const selectorActiveTone: Record<SheetAccentTone, string> = {
  neutral: 'border-white bg-white text-[#0b1114] shadow-[0_10px_24px_rgba(0,0,0,0.28)]',
  purple: 'border-[#8367f1] bg-[#8367f1] text-white shadow-[0_10px_24px_rgba(131,103,241,0.32)]',
  green: 'border-[#30b97d] bg-[#30b97d] text-white shadow-[0_10px_24px_rgba(48,185,125,0.32)]',
  red: 'border-[#d06565] bg-[#d06565] text-white shadow-[0_10px_24px_rgba(208,101,101,0.3)]',
}

const primaryTone: Record<SheetAccentTone, string> = {
  neutral: 'bg-white text-[#0b1114] hover:bg-white/92',
  purple: 'bg-[#8367f1] text-white hover:bg-[#8d73f3]',
  green: 'bg-[#30b97d] text-white hover:bg-[#38c789]',
  red: 'bg-[#d06565] text-white hover:bg-[#db7070]',
}

const tileTone: Record<SheetAccentTone, string> = {
  neutral: 'border-white/[0.12] hover:border-white/[0.2] hover:bg-white/[0.06]',
  purple: 'border-[#8367f1]/30 hover:border-[#8367f1]/45 hover:bg-[#8367f1]/12',
  green: 'border-[#30b97d]/30 hover:border-[#30b97d]/45 hover:bg-[#30b97d]/12',
  red: 'border-[#d06565]/30 hover:border-[#d06565]/45 hover:bg-[#d06565]/12',
}

const tileIconTone: Record<SheetAccentTone, string> = {
  neutral: 'border-white/[0.14] bg-white/[0.06] text-white/94',
  purple: 'border-[#8367f1]/36 bg-[#8367f1]/16 text-[#c9bcff]',
  green: 'border-[#30b97d]/36 bg-[#30b97d]/16 text-[#afe6cc]',
  red: 'border-[#d06565]/36 bg-[#d06565]/16 text-[#f1b4b4]',
}

export const sheetInputClassName =
  'h-12 rounded-2xl border border-white/[0.1] bg-white/[0.03] px-4 text-[15px] text-white placeholder:text-white/34 focus-visible:border-[#73dbe1]/45 focus-visible:ring-2 focus-visible:ring-[#73dbe1]/32 focus-visible:ring-offset-0 transition-colors'

export function SheetSection({ label, meta, children, className }: SheetSectionProps) {
  return (
    <section
      className={cn(
        'space-y-3 rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-3.5',
        className,
      )}
    >
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/56">{label}</p>
        {meta ? <p className="text-[12px] text-white/42">{meta}</p> : null}
      </div>
      {children}
    </section>
  )
}

type SheetSelectorButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected: boolean
  tone?: SheetAccentTone
}

export function SheetSelectorButton({
  selected,
  tone = 'neutral',
  className,
  children,
  ...props
}: SheetSelectorButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'min-h-11 rounded-[14px] border px-3 py-2 text-[12px] font-semibold tracking-[0.02em] transition-all',
        selected
          ? selectorActiveTone[tone]
          : 'border-white/[0.11] bg-white/[0.02] text-white/68 hover:bg-white/[0.06] hover:text-white/84',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

type SheetPrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: SheetAccentTone
}

export function SheetPrimaryButton({ tone = 'neutral', className, children, ...props }: SheetPrimaryButtonProps) {
  return (
    <Button
      type="button"
      className={cn(
        'h-12 w-full rounded-2xl text-[14px] font-semibold tracking-[0.01em] shadow-[0_12px_24px_rgba(0,0,0,0.24)] transition-all active:scale-[0.99]',
        primaryTone[tone],
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  )
}

type SheetCommandTileProps = {
  icon: LucideIcon
  label: string
  description?: string
  tone?: SheetAccentTone
  onClick: () => void
  className?: string
}

export function SheetCommandTile({
  icon: Icon,
  label,
  description,
  tone = 'neutral',
  onClick,
  className,
}: SheetCommandTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-[22px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-4 text-center transition-all active:scale-[0.98]',
        tileTone[tone],
        className,
      )}
    >
      <span className={cn('mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border', tileIconTone[tone])}>
        <Icon size={18} strokeWidth={2.2} />
      </span>
      <p className="text-[13px] font-semibold tracking-[0.01em] text-white">{label}</p>
      {description ? (
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/46">{description}</p>
      ) : null}
    </button>
  )
}