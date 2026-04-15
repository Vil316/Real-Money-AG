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
  children: ReactNode
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
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
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.8 }}
            className="relative w-full max-h-[90vh] bg-card border-t border-border rounded-t-[32px] shadow-2xl flex flex-col pt-2 pb-safe"
          >
            {/* Pill drag handle purely for aesthetics right now */}
            <div className="w-12 h-1.5 bg-foreground/10 rounded-full mx-auto mb-4" />
            
            <div className="flex-none px-6 pb-2 flex justify-between items-center">
              <h2 className="text-xl font-bold font-display tracking-tight text-foreground">{title}</h2>
              <button 
                onClick={onClose} 
                className="w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center text-foreground hover:bg-foreground/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 pb-10 hide-scrollbar overscroll-contain">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
