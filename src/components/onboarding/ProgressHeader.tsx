import { ArrowLeft } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

type ProgressHeaderProps = {
  currentStep: number
  totalSteps: number
  title?: string
  brandLayoutId?: string
  onBack?: () => void
  showBack?: boolean
}

export function ProgressHeader({
  currentStep,
  totalSteps,
  title = 'RealMoney',
  brandLayoutId = 'onboarding-brandmark',
  onBack,
  showBack = false,
}: ProgressHeaderProps) {
  const progress = Math.min(currentStep / totalSteps, 1)
  const prefersReducedMotion = useReducedMotion()
  const brandTransition = {
    type: 'tween' as const,
    duration: 0.38,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  }

  return (
    <header className="pt-1">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {showBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.04] text-white/68 transition-all hover:bg-white/[0.08] hover:text-white/88"
              aria-label="Go back"
            >
              <ArrowLeft size={15} strokeWidth={2.4} />
            </button>
          ) : (
            <div className="h-9 w-9" aria-hidden="true" />
          )}
          {title ? (
            <motion.p
              layout
              layoutId={brandLayoutId}
              transition={brandTransition}
              className="text-[11px] font-medium tracking-[0.09em] text-white/42"
            >
              {title}
            </motion.p>
          ) : null}
        </div>

        {currentStep > 0 && currentStep <= totalSteps ? (
          <p className="text-[11px] font-medium tabular-nums text-white/42">
            {currentStep} of {totalSteps}
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-full bg-white/[0.06]" style={{ height: '2px' }}>
        <motion.div
          className="h-full rounded-full bg-[linear-gradient(90deg,rgba(118,210,220,0.95),rgba(237,192,125,0.95))]"
          initial={false}
          animate={{ width: `${progress * 100}%` }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 0.42, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
          }
        />
      </div>
    </header>
  )
}