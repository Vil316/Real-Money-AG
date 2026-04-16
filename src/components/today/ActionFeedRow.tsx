import { ChevronRight } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

type ActionFeedTone = 'info' | 'neutral' | 'success' | 'attention'

type ActionFeedRowProps = {
  title: string
  detail: string
  tone?: ActionFeedTone
  actionLabel?: string
  onAction?: () => void
  index: number
}

function getToneStyles(tone: ActionFeedTone) {
  switch (tone) {
    case 'success':
      return {
        dotClass: 'bg-[#74d4a3]',
        dotGlow: '0 0 10px rgba(116,212,163,0.35)',
        titleClass: 'text-white/96',
        chevronClass: 'text-[#7ec89f]/55',
        actionClass: 'border-[#74d4a3]/26 bg-[#74d4a3]/10 text-[#9ddfbe]',
      }
    case 'attention':
      return {
        dotClass: 'bg-[#d6b27a]',
        dotGlow: '0 0 10px rgba(214,178,122,0.34)',
        titleClass: 'text-white/96',
        chevronClass: 'text-[#d6b27a]/62',
        actionClass: 'border-[#d6b27a]/28 bg-[#d6b27a]/11 text-[#dfc094]',
      }
    case 'info':
      return {
        dotClass: 'bg-[#73dbe1]',
        dotGlow: '0 0 12px rgba(115,219,225,0.38)',
        titleClass: 'text-white/95',
        chevronClass: 'text-[#73dbe1]/58',
        actionClass: 'border-[#73dbe1]/28 bg-[#73dbe1]/10 text-[#95e4e8]',
      }
    default:
      return {
        dotClass: 'bg-white/26',
        dotGlow: '0 0 0 rgba(0,0,0,0)',
        titleClass: 'text-white/90',
        chevronClass: 'text-white/28',
        actionClass: 'border-white/[0.18] bg-white/[0.04] text-white/70',
      }
  }
}

export function ActionFeedRow({ title, detail, tone = 'neutral', actionLabel, onAction, index }: ActionFeedRowProps) {
  const prefersReducedMotion = useReducedMotion()
  const toneStyles = getToneStyles(tone)
  const isPulseTone = tone === 'info' || tone === 'success' || tone === 'attention'

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, delay: 0.04 * index, ease: 'easeOut' }}
      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
    >
      <motion.div
        className={`mt-0.5 h-2.5 w-2.5 rounded-full ${toneStyles.dotClass}`}
        animate={
          prefersReducedMotion
            ? { opacity: isPulseTone ? 0.92 : 0.66 }
            : isPulseTone
              ? {
                  opacity: [0.5, 1, 0.5],
                  scale: [1, 1.08, 1],
                  boxShadow: [
                    '0 0 0 rgba(0,0,0,0)',
                    toneStyles.dotGlow,
                    '0 0 0 rgba(0,0,0,0)',
                  ],
                }
              : undefined
        }
        transition={{ duration: 1.8, ease: 'easeInOut', repeat: Infinity }}
      />

      <div className="min-w-0 flex-1">
        <p className={`truncate text-[14px] font-medium ${toneStyles.titleClass}`}>{title}</p>
        <p className="mt-1 text-[12px] text-white/48">{detail}</p>
      </div>

      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] border ${toneStyles.actionClass}`}
        >
          {actionLabel}
        </button>
      ) : (
        <ChevronRight size={16} className={`shrink-0 ${toneStyles.chevronClass}`} />
      )}
    </motion.div>
  )
}
