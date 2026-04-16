import { cn } from '@/lib/utils'

type MetadataChipTone = 'neutral' | 'teal' | 'success' | 'attention' | 'danger'

type MetadataChipProps = {
  label: string
  tone?: MetadataChipTone
  className?: string
}

function getToneClass(tone: MetadataChipTone): string {
  switch (tone) {
    case 'teal':
      return 'border-[#0B8289]/24 bg-[#0B8289]/12 text-[#8cd8de]'
    case 'success':
      return 'border-[#74d4a3]/28 bg-[#74d4a3]/12 text-[#9adfbc]'
    case 'attention':
      return 'border-[#d6b27a]/30 bg-[#d6b27a]/12 text-[#dfc095]'
    case 'danger':
      return 'border-[#d67a7a]/30 bg-[#d67a7a]/12 text-[#e6a2a2]'
    default:
      return 'border-white/[0.1] bg-white/[0.04] text-white/58'
  }
}

export function MetadataChip({ label, tone = 'neutral', className }: MetadataChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]',
        getToneClass(tone),
        className,
      )}
    >
      {label}
    </span>
  )
}
