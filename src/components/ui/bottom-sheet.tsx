import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createPortal } from 'react-dom'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title: string
  headerMeta?: string
  headerIcon?: ReactNode
  contextLabel?: string
  contentClassName?: string
  children: ReactNode
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  headerMeta,
  headerIcon,
  contextLabel = 'Command Surface',
  contentClassName,
  children,
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#050607]/78 backdrop-blur-md"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.8 }}
            className="relative w-full max-h-[90vh] rounded-t-[32px] border border-white/[0.08] bg-[#101316] text-white shadow-[0_-22px_70px_rgba(0,0,0,0.54)] flex flex-col pt-2 pb-safe"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/[0.06] to-transparent" />
            <div className="h-1.5 w-12 rounded-full bg-white/[0.16] mx-auto mb-3" />
            
            <div className="flex-none px-5 pb-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/44">{contextLabel}</span>
                <button
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.03] text-white/74 transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex items-center gap-3">
                {headerIcon ? (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/[0.11] bg-white/[0.04] text-white/88">
                    {headerIcon}
                  </span>
                ) : null}

                <div className="min-w-0">
                  <h2 className="text-[21px] font-semibold font-display tracking-[-0.02em] text-white">{title}</h2>
                  {headerMeta ? (
                    <p className="mt-0.5 truncate text-[12px] text-white/46">{headerMeta}</p>
                  ) : null}
                </div>
              </div>
            </div>
            
            <div className={cn('flex-1 overflow-y-auto px-5 pb-6 hide-scrollbar overscroll-contain', contentClassName)}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
