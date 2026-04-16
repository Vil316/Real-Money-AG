import { Sparkles } from 'lucide-react'

type SummaryCardProps = {
  headline: string
  subline: string
  highlights: string[]
  supportLine: string
}

export function SummaryCard({ headline, subline, highlights, supportLine }: SummaryCardProps) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/[0.1] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.18)]">
      <div className="mb-5">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-white/66">
          <span className="flex h-8 w-8 items-center justify-center rounded-[12px] border border-[#99dfe8]/32 bg-[#76d2dc]/18">
            <Sparkles size={16} strokeWidth={2.2} className="text-[#b8eef3]" />
          </span>
          Your setup
        </h3>
        <p className="mt-3 text-[16px] font-semibold tracking-[-0.01em] text-white">{headline}</p>
      </div>

      <p className="text-[14px] leading-6 text-white/68">{subline}</p>

      {highlights.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {highlights.map((highlight) => (
            <span
              key={highlight}
              className="rounded-full border border-[#84dce7]/28 bg-[#76d2dc]/12 px-3 py-1.5 text-[12px] font-medium text-white/78"
            >
              {highlight}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 rounded-[18px] border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[13px] leading-5 text-white/60">
        {supportLine}
      </div>
    </div>
  )
}