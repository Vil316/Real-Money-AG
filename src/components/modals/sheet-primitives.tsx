import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { cn } from '@/lib/utils'

export type SheetAccentTone = 'neutral' | 'purple' | 'green' | 'red'

export type SheetSegmentOption = {
  value: string
  label: string
  meta?: string
  icon?: ReactNode
}

type SheetSectionProps = {
  label: string
  meta?: string
  children: ReactNode
  className?: string
}

const identityTone: Record<SheetAccentTone, string> = {
  neutral: 'border-white/[0.12] bg-white/[0.05] text-white/74',
  purple: 'border-[#8367f1]/28 bg-[#8367f1]/12 text-[#cec4ff]',
  green: 'border-[#30b97d]/28 bg-[#30b97d]/12 text-[#b7e7d2]',
  red: 'border-[#d06565]/28 bg-[#d06565]/12 text-[#efb7b7]',
}

const primaryTone: Record<SheetAccentTone, string> = {
  neutral: 'border-transparent bg-white text-[#0b1114] hover:bg-white/94',
  purple: 'border-transparent bg-[#795fe2] text-white hover:bg-[#8369eb]',
  green: 'border-transparent bg-[#2ea976] text-white hover:bg-[#35b680]',
  red: 'border-transparent bg-[#bb5a5a] text-white hover:bg-[#c56969]',
}

const segmentedToneActive: Record<SheetAccentTone, string> = {
  neutral: 'border-white bg-white text-[#0b1114] shadow-[0_10px_22px_rgba(0,0,0,0.26)]',
  purple: 'border-[#795fe2] bg-[#795fe2] text-white shadow-[0_10px_22px_rgba(121,95,226,0.32)]',
  green: 'border-[#2ea976] bg-[#2ea976] text-white shadow-[0_10px_22px_rgba(46,169,118,0.3)]',
  red: 'border-[#bb5a5a] bg-[#bb5a5a] text-white shadow-[0_10px_22px_rgba(187,90,90,0.28)]',
}

const tileTone: Record<SheetAccentTone, string> = {
  neutral: 'border-white/[0.11] hover:border-white/[0.2] hover:bg-white/[0.055]',
  purple: 'border-[#795fe2]/28 hover:border-[#795fe2]/45 hover:bg-[#795fe2]/11',
  green: 'border-[#2ea976]/28 hover:border-[#2ea976]/45 hover:bg-[#2ea976]/11',
  red: 'border-[#bb5a5a]/28 hover:border-[#bb5a5a]/45 hover:bg-[#bb5a5a]/11',
}

const tileIconTone: Record<SheetAccentTone, string> = {
  neutral: 'border-white/[0.14] bg-white/[0.045] text-white/88',
  purple: 'border-[#795fe2]/34 bg-[#795fe2]/15 text-[#cec4ff]',
  green: 'border-[#2ea976]/34 bg-[#2ea976]/15 text-[#afe6cd]',
  red: 'border-[#bb5a5a]/34 bg-[#bb5a5a]/15 text-[#efb7b7]',
}

export const sheetTextFieldClassName =
  'h-12 rounded-[16px] border border-white/[0.11] bg-white/[0.03] px-4 text-[14px] text-white placeholder:text-white/34 focus-visible:border-[#73dbe1]/44 focus-visible:ring-2 focus-visible:ring-[#73dbe1]/28 focus-visible:ring-offset-0 transition-colors'

export const sheetInputClassName = sheetTextFieldClassName

type SheetHeaderProps = {
  title: string
  subtitle?: string
  marker?: string
  markerTone?: SheetAccentTone
  icon?: ReactNode
  className?: string
}

export function SheetHeader({
  title,
  subtitle,
  marker,
  markerTone = 'neutral',
  icon,
  className,
}: SheetHeaderProps) {
  return (
    <div className={cn('mb-2 flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {icon ? <span className="text-white/76">{icon}</span> : null}
          <h3 className="truncate text-[15px] font-semibold tracking-[0.01em] text-white">{title}</h3>
        </div>
        {subtitle ? <p className="mt-0.5 text-[12px] text-white/44">{subtitle}</p> : null}
      </div>
      {marker ? <SheetIdentityChip label={marker} tone={markerTone} /> : null}
    </div>
  )
}

type SheetIdentityChipProps = {
  label: string
  tone?: SheetAccentTone
  className?: string
}

export function SheetIdentityChip({ label, tone = 'neutral', className }: SheetIdentityChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
        identityTone[tone],
        className,
      )}
    >
      {label}
    </span>
  )
}

type SheetSectionLabelProps = {
  label: string
  meta?: string
  className?: string
}

export function SheetSectionLabel({ label, meta, className }: SheetSectionLabelProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/56">{label}</p>
      {meta ? <p className="text-[12px] text-white/42">{meta}</p> : null}
    </div>
  )
}

export function SheetSection({ label, meta, children, className }: SheetSectionProps) {
  return (
    <section
      className={cn(
        'space-y-3 rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-3.5',
        className,
      )}
    >
      <SheetSectionLabel label={label} meta={meta} />
      {children}
    </section>
  )
}

type SheetTextFieldProps = ComponentProps<typeof Input>

export function SheetTextField({ className, ...props }: SheetTextFieldProps) {
  return <Input {...props} className={cn(sheetTextFieldClassName, className)} />
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
        'min-h-11 rounded-[14px] border px-3 py-2 text-[12px] font-semibold tracking-[0.02em] transition-all duration-200',
        selected
          ? segmentedToneActive[tone]
          : 'border-white/[0.11] bg-white/[0.02] text-white/66 hover:bg-white/[0.055] hover:text-white/84',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

type SheetSegmentedSelectorProps = {
  value: string
  onChange: (value: string) => void
  options: SheetSegmentOption[]
  tone?: SheetAccentTone
  columns?: 2 | 3 | 4
  className?: string
  optionClassName?: string
}

const segmentedColumns = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
} as const

export function SheetSegmentedSelector({
  value,
  onChange,
  options,
  tone = 'neutral',
  columns = 2,
  className,
  optionClassName,
}: SheetSegmentedSelectorProps) {
  return (
    <div className={cn('grid gap-2', segmentedColumns[columns], className)}>
      {options.map(option => {
        const isActive = option.value === value
        return (
          <button
            type="button"
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'min-h-11 rounded-[14px] border px-3 py-2 text-center transition-all duration-200 active:scale-[0.99]',
              isActive
                ? segmentedToneActive[tone]
                : 'border-white/[0.11] bg-white/[0.02] text-white/66 hover:bg-white/[0.055] hover:text-white/84',
              optionClassName,
            )}
          >
            {option.icon ? <span className="mb-1 inline-flex items-center justify-center text-inherit/90">{option.icon}</span> : null}
            <p className="text-[12px] font-semibold tracking-[0.02em]">{option.label}</p>
            {option.meta ? <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.11em] text-inherit/68">{option.meta}</p> : null}
          </button>
        )
      })}
    </div>
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
        'h-12 w-full rounded-[16px] border px-4 text-[14px] font-semibold tracking-[0.01em] shadow-[0_12px_24px_rgba(0,0,0,0.24)] transition-all duration-200 active:scale-[0.99]',
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
        'rounded-[22px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018))] p-4 text-center transition-all duration-200 hover:shadow-[0_12px_26px_rgba(0,0,0,0.22)] active:translate-y-[1px] active:scale-[0.985]',
        tileTone[tone],
        className,
      )}
    >
      <span className={cn('mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-[14px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]', tileIconTone[tone])}>
        <Icon size={18} strokeWidth={2.2} />
      </span>
      <p className="text-[13px] font-semibold tracking-[0.01em] text-white">{label}</p>
      {description ? (
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.11em] text-white/38">{description}</p>
      ) : null}
    </button>
  )
}