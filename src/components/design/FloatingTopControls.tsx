import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Plus } from 'lucide-react'
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useProfile } from '@/hooks/useProfile'
import { FloatingIconButton } from '@/components/today/FloatingIconButton'
import { ProfileDrawer } from '@/components/modals/ProfileDrawer'
import { AddMenuDrawer } from '@/components/modals/AddMenuDrawer'
import { AddAccountForm } from '@/components/modals/forms/AddAccountForm'
import { AddBillForm } from '@/components/modals/forms/AddBillForm'
import { AddDebtForm } from '@/components/modals/forms/AddDebtForm'
import { AddGoalForm } from '@/components/modals/forms/AddGoalForm'

type FloatingTopControlsProps = {
  className?: string
  hasLivePulse?: boolean
}

export function FloatingTopControls({ className, hasLivePulse = false }: FloatingTopControlsProps) {
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion()
  const { scrollY } = useScroll()
  const { profile } = useProfile()

  const [isCondensed, setIsCondensed] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [activeActionForm, setActiveActionForm] = useState<string | null>(null)

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const next = latest > 24
    setIsCondensed((prev) => (prev === next ? prev : next))
  })

  const profileInitial = profile?.display_name?.charAt(0).toUpperCase() ?? 'R'

  return (
    <>
      <motion.div
        className={cn(
          'fixed inset-x-0 top-[max(env(safe-area-inset-top),0px)] z-50 flex justify-center px-4 pt-5 pointer-events-none',
          className,
        )}
        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: isCondensed ? 0.86 : 1 }}
        transition={{ duration: 0.26, ease: 'easeOut' }}
      >
        <div
          className={cn(
            'pointer-events-auto flex w-full max-w-sm items-center justify-between',
            isCondensed
              ? 'rounded-full border border-white/[0.03] bg-[#0d1114]/38 px-1.5 py-1 shadow-[0_8px_20px_rgba(0,0,0,0.2)] backdrop-blur-[6px]'
              : 'px-0.5',
          )}
        >
          <FloatingIconButton
            onClick={() => setIsProfileOpen(true)}
            className={cn(
              'h-11 w-11',
              isCondensed
                ? 'shadow-[0_8px_18px_rgba(0,0,0,0.22)]'
                : 'shadow-[0_14px_32px_rgba(0,0,0,0.34)]',
            )}
            ariaLabel="Open profile"
          >
            <span className="text-sm font-semibold text-white">{profileInitial}</span>
          </FloatingIconButton>

          <div className="flex items-center justify-end gap-1.5">
            <FloatingIconButton
              className={cn('h-11 w-11', isCondensed && 'shadow-[0_8px_18px_rgba(0,0,0,0.2)]')}
              nudge={hasLivePulse}
              ariaLabel="Notifications"
              onClick={() => navigate('/notifications')}
            >
              <Bell size={17} strokeWidth={2.1} />
            </FloatingIconButton>

            <FloatingIconButton
              onClick={() => setIsAddMenuOpen(true)}
              className={cn(
                'h-11 w-11 border-[#0b8289]/24 bg-[#0B8289]',
                isCondensed
                  ? 'shadow-[0_10px_20px_rgba(11,130,137,0.22)]'
                  : 'shadow-[0_18px_34px_rgba(11,130,137,0.36)]',
              )}
              glowPulse
              ariaLabel="Add item"
            >
              <Plus size={17} strokeWidth={2.1} />
            </FloatingIconButton>
          </div>
        </div>
      </motion.div>

      <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <AddMenuDrawer
        isOpen={isAddMenuOpen}
        onClose={() => setIsAddMenuOpen(false)}
        onSelectAction={(actionId) => setActiveActionForm(actionId)}
      />
      <AddAccountForm isOpen={activeActionForm === 'account'} onClose={() => setActiveActionForm(null)} />
      <AddBillForm isOpen={activeActionForm === 'bill'} onClose={() => setActiveActionForm(null)} />
      <AddDebtForm isOpen={activeActionForm === 'debt'} onClose={() => setActiveActionForm(null)} />
      <AddGoalForm isOpen={activeActionForm === 'goal'} onClose={() => setActiveActionForm(null)} />
    </>
  )
}
