import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type ChoiceCardProps = {
  title: string
  description?: string
  icon?: LucideIcon
  selected?: boolean
  onClick: () => void
  tile?: boolean
  compact?: boolean
  className?: string
}

export function ChoiceCard({
  title,
  description,
  icon: Icon,
  selected = false,
  onClick,
  tile = false,
  compact = false,
  className,
}: ChoiceCardProps) {
  const iconSize = tile ? (compact ? 15 : 16) : compact ? 15 : 16
  const iconStroke = tile ? (compact ? 1.95 : 2) : compact ? 2 : 2.1

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.985 }}
      className={cn(
        'group relative w-full overflow-hidden rounded-[18px] border text-left transition-all duration-200',
        tile ? (compact ? 'px-3.5 py-2.5' : 'px-4 py-3.5') : compact ? 'px-3.5 py-2.5' : 'px-4 py-3.5',
        selected
          ? 'border-[#8edce7]/46 bg-[linear-gradient(180deg,rgba(126,219,230,0.11),rgba(255,255,255,0.035))] shadow-[0_8px_18px_rgba(59,145,157,0.15)]'
          : 'border-white/[0.1] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.012))] shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] hover:border-white/[0.16] hover:bg-white/[0.048]',
        className,
      )}
    >
      <span
        className={cn(
          'pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-200',
          selected
            ? 'opacity-100 bg-[radial-gradient(circle_at_14%_0%,rgba(189,243,250,0.15),transparent_56%)]'
            : 'opacity-0',
        )}
      />

      <div
        className={cn(
          'relative flex items-start gap-2.5',
          tile && (compact ? 'min-h-[50px] flex-col justify-end gap-1.5' : 'min-h-[58px] flex-col justify-end gap-2'),
        )}
      >
        {Icon ? (
          <span
            className={cn(
              'mt-[1px] inline-flex shrink-0 items-center justify-center border transition-colors duration-200',
              tile ? (compact ? 'h-7 w-7 rounded-[10px]' : 'h-8 w-8 rounded-[11px]') : 'h-7 w-7 rounded-[10px]',
              selected
                ? 'border-[#96e1ec]/38 bg-[#8cdbe6]/16 text-[#bdf3f9]'
                : 'border-white/[0.1] bg-white/[0.03] text-white/58',
            )}
          >
            <Icon size={iconSize} strokeWidth={iconStroke} />
          </span>
        ) : null}

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              compact
                ? 'text-[14px] font-medium tracking-[-0.012em] transition-colors duration-200'
                : 'text-[15px] font-medium tracking-[-0.014em] transition-colors duration-200',
              selected ? 'text-white' : 'text-white/88',
            )}
          >
            {title}
          </p>

          {description ? (
            <p
              className={cn(
                'mt-1 text-[13px] leading-5 transition-colors duration-200',
                selected ? 'text-white/50' : 'text-white/36',
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </motion.button>
  )
}
