import { Activity } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

type TopStatusPillProps = {
  text: string
}

export function TopStatusPill({ text }: TopStatusPillProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: 'easeOut' }}
      className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#13171b]/90 px-3 py-1.5 text-[11px] font-medium tracking-[0.06em] text-white/85 shadow-[0_12px_34px_rgba(0,0,0,0.35)] backdrop-blur"
    >
      <motion.span
        className="inline-flex"
        animate={
          prefersReducedMotion
            ? { opacity: 0.7 }
            : {
                opacity: [0.58, 1, 0.58],
              }
        }
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Activity size={11} className="text-[#89e3e7]" />
      </motion.span>
      <span className="truncate">{text}</span>
    </motion.div>
  )
}
