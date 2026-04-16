import { ChevronRight } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

type ActionTone = 'info' | 'neutral' | 'success' | 'attention'

type ActionRowProps = {
  title: string
  detail: string
  tone?: ActionTone
  actionLabel?: string
  onAction?: () => void
  index?: number
}

function getToneStyles(tone: ActionTone) {
  switch (tone) {
    case 'success':
      return {
        dot: 'bg-[#74d4a3]',
        title: 'text-white/96',
        action: 'border-[#74d4a3]/28 bg-[#74d4a3]/10 text-[#9ddfbe]',
        chevron: 'text-[#7ec89f]/55',
      }
    case 'attention':
      return {
        dot: 'bg-[#d6b27a]',
        title: 'text-white/96',
        action: 'border-[#d6b27a]/28 bg-[#d6b27a]/11 text-[#dfc094]',
        chevron: 'text-[#d6b27a]/62',
      }
    case 'info':
      return {
        dot: 'bg-[#73dbe1]',
        title: 'text-white/95',
        action: 'border-[#73dbe1]/28 bg-[#73dbe1]/10 text-[#95e4e8]',
        chevron: 'text-[#73dbe1]/58',
      }
    default:
      return {
        dot: 'bg-white/26',
        title: 'text-white/90',
        action: 'border-white/[0.18] bg-white/[0.04] text-white/70',
        chevron: 'text-white/28',
      }
  }
}

export function ActionRow({
  title,
  detail,
  tone = 'neutral',
  actionLabel,
  onAction,
  index = 0,
}: ActionRowProps) {
  const prefersReducedMotion = useReducedMotion()
  const toneStyles = getToneStyles(tone)

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: 0.03 * index, ease: 'easeOut' }}
      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
    >
      <span className={cn('mt-0.5 h-2.5 w-2.5 rounded-full', toneStyles.dot)} />

      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-[14px] font-medium', toneStyles.title)}>{title}</p>
        <p className="mt-1 text-[12px] text-white/48">{detail}</p>
      </div>

      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className={cn(
            'rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]',
            toneStyles.action,
          )}
        >
          {actionLabel}
        </button>
      ) : (
        <ChevronRight size={16} className={cn('shrink-0', toneStyles.chevron)} />
      )}
    </motion.div>
  )
}
