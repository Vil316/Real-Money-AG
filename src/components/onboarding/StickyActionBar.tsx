import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type StickyActionBarProps = {
  primaryLabel: string
  onPrimary: () => void
  primaryDisabled?: boolean
  secondaryLabel?: string
  onSecondary?: () => void
  loading?: boolean
  className?: string
}

export function StickyActionBar({
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  secondaryLabel,
  onSecondary,
  loading = false,
  className,
}: StickyActionBarProps) {
  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-8',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#05070b] via-[#05070b]/96 to-transparent" />
      <div className="pointer-events-auto relative flex items-center gap-3">
        {secondaryLabel && onSecondary ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onSecondary}
            className="h-11 rounded-[16px] px-5 text-[14px] font-medium text-white/64 transition-all hover:bg-white/[0.06] hover:text-white/86"
          >
            {secondaryLabel}
          </Button>
        ) : null}

        <Button
          type="button"
          onClick={onPrimary}
          disabled={primaryDisabled || loading}
          className="h-12 flex-1 rounded-[16px] border border-white/[0.1] bg-[linear-gradient(180deg,#f4f8fb_0%,#deeaf2_100%)] px-5 text-[14px] font-semibold text-[#081018] shadow-[0_10px_24px_rgba(0,0,0,0.2)] transition-all hover:brightness-[1.02] active:brightness-[0.98] disabled:cursor-default disabled:opacity-50"
        >
          {loading ? 'Setting up…' : primaryLabel}
        </Button>
      </div>
    </div>
  )
}