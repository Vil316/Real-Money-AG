import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { motion, AnimatePresence, animate, useDragControls, useMotionTemplate, useMotionValue, useTransform } from 'framer-motion'
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
  const dragControls = useDragControls()
  const y = useMotionValue(0)
  const backdropDim = useTransform(y, [0, 320], [0.62, 0.32])
  const backdropBlur = useTransform(y, [0, 320], [1.4, 0.6])
  const backdropColor = useMotionTemplate`rgba(7, 10, 12, ${backdropDim})`
  const backdropFilter = useMotionTemplate`blur(${backdropBlur}px)`

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      y.set(0)
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen, y])

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const springBack = () => {
    animate(y, 0, {
      type: 'spring',
      stiffness: 360,
      damping: 34,
      mass: 0.7,
    })
  }

  const handleDragEnd = (_: PointerEvent, info: { offset: { y: number }; velocity: { y: number } }) => {
    const shouldClose = info.offset.y > 140 || info.velocity.y > 920
    if (shouldClose) {
      onClose()
      return
    }

    springBack()
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            onClick={onClose}
            style={{
              backgroundColor: backdropColor,
              backdropFilter,
              WebkitBackdropFilter: backdropFilter,
            }}
            className="absolute inset-0"
          />
          <motion.div
            initial={{ y: 42, opacity: 0.965 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.985 }}
            transition={{ type: 'spring', damping: 36, stiffness: 330, mass: 0.9 }}
            className="w-full [transform:translateZ(0)]"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              drag="y"
              dragDirectionLock
              dragListener={false}
              dragControls={dragControls}
              dragElastic={{ top: 0, bottom: 0.22 }}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragMomentum={false}
              onDragEnd={handleDragEnd}
              style={{ y }}
              className="relative isolate w-full max-h-[90vh] overflow-hidden rounded-t-[32px] border border-white/[0.085] bg-[#101316] text-white shadow-[0_-14px_42px_rgba(0,0,0,0.34)] [transform:translateZ(0)] flex flex-col pt-2 pb-safe"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/[0.06] to-transparent" />
              <div
                onPointerDown={(event) => dragControls.start(event)}
                className="mx-auto mb-2.5 flex w-full cursor-grab justify-center touch-none active:cursor-grabbing"
              >
                <div className="h-1.5 w-12 rounded-full bg-white/[0.16]" />
              </div>

              <div className="flex-none px-5 pb-1.5">
                <div
                  onPointerDown={(event) => dragControls.start(event)}
                  className="mb-1.5 touch-none"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/44">{contextLabel}</span>
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
