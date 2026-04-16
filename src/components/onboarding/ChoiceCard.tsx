import type { LucideIcon } from 'lucide-react'
import { Check } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type ChoiceCardProps = {
  title: string
  description?: string
  icon?: LucideIcon
  selected?: boolean
  onClick: () => void
  tile?: boolean
  className?: string
}

export function ChoiceCard({
  title,
  description,
  icon: Icon,
  selected = false,
  onClick,
  tile = false,
  className,
}: ChoiceCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.988 }}
      animate={{ y: selected ? -1 : 0 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'group relative w-full overflow-hidden rounded-[18px] border text-left transition-all duration-200',
        tile ? 'px-4 py-4' : 'px-4 py-3.5',
        selected
          ? 'border-[#7dd5df]/40 bg-[linear-gradient(180deg,rgba(118,210,220,0.11),rgba(255,255,255,0.035))] shadow-[0_8px_18px_rgba(78,174,186,0.09)]'
          : 'border-white/[0.1] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] hover:border-white/[0.15]',
        className,
      )}
    >
      <div className="relative flex items-start gap-3">
        {Icon ? (
          <span
            className={cn(
              'mt-[2px] shrink-0 transition-colors duration-200',
              selected ? 'text-[#9feaf3]' : 'text-white/66',
            )}
          >
            <Icon size={17} strokeWidth={2.1} />
          </span>
        ) : null}

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'text-[15px] font-semibold tracking-[-0.015em] transition-colors duration-200',
              selected ? 'text-white' : 'text-white/90',
            )}
          >
            {title}
          </p>
          {description ? (
            <p
              className={cn(
                'mt-1 text-[13px] leading-5 transition-colors duration-200',
                selected ? 'text-white/50' : 'text-white/38',
              )}
            >
              {description}
            </p>
          ) : null}
        </div>

        <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.span
                key="checked"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.45, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-[#7dd5df]/56 bg-[#76d2dc]/22 text-[#bfeef5]"
              >
                <Check size={12} strokeWidth={3} />
              </motion.span>
            ) : (
              <motion.span
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.12] bg-transparent"
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.button>
  )
}