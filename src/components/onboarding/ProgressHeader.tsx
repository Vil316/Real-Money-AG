import { ArrowLeft } from 'lucide-react'

type ProgressHeaderProps = {
  currentStep: number
  totalSteps: number
  title?: string
  onBack?: () => void
  showBack?: boolean
}

export function ProgressHeader({
  currentStep,
  totalSteps,
  title = 'RealMoney',
  onBack,
  showBack = false,
}: ProgressHeaderProps) {
  const progress = Math.min(currentStep / totalSteps, 1)

  return (
    <header className="pt-1">
      <div className="mb-4 flex items-center justify-between gap-3">
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/46">{title}</p>
        </div>

        {currentStep > 0 && currentStep <= totalSteps ? (
          <div className="rounded-full border border-white/[0.09] bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white/62">
            {currentStep}/{totalSteps}
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-full bg-white/[0.06]" style={{ height: '2px' }}>
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,rgba(118,210,220,0.95),rgba(160,130,255,0.95))] transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </header>
  )
}