import { useMemo, useState } from 'react'
import { CheckCircle2, HandCoins } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useObligations } from '@/hooks/useObligations'
import { useProfile } from '@/hooks/useProfile'
import {
  formatObligationAmountPresentation,
  getObligationCadence,
  getObligationMonthlyMultiplier,
} from '@/lib/obligations'
import { formatCurrency } from '@/lib/utils'
import type { Obligation } from '@/types'
import {
  EmptyStateCard,
  FloatingTopControls,
  MetadataChip,
  PageShell,
  SectionCard,
  SectionHeader,
  SummaryCard,
} from '@/components/design'

function estimateObligationAmount(obligation: Obligation, fallbackIncome: number): number {
  if (obligation.amount_type === 'percentage') {
    const percentage = Number(obligation.amount || 0)
    return (fallbackIncome * percentage) / 100
  }

  return Number(obligation.amount || 0)
}

export function ObligationsPage() {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const { obligations, isLoading, markDone } = useObligations()
  const [messages, setMessages] = useState<string[]>([])

  const currency = typeof profile?.currency === 'string' && profile.currency.trim().length > 0
    ? profile.currency
    : 'GBP'
  const incomeAmount = Number(profile?.income_amount || 0)

  const totalEstimatedMonthly = useMemo(
    () => obligations.reduce((sum, obligation) => {
      const amount = estimateObligationAmount(obligation, incomeAmount)
      return sum + amount * getObligationMonthlyMultiplier(getObligationCadence(obligation))
    }, 0),
    [incomeAmount, obligations],
  )

  const completedThisCycle = obligations.filter(obligation => obligation.is_fulfilled_this_cycle).length

  const addMessage = (message: string) => {
    setMessages(prev => [...prev, message])
    setTimeout(() => setMessages(prev => prev.slice(1)), 2800)
  }

  if (isLoading) {
    return (
      <PageShell topSlot={<FloatingTopControls />}>
        <SectionCard>
          <p className="py-8 text-center text-sm font-medium text-white/60">Loading obligations...</p>
        </SectionCard>
      </PageShell>
    )
  }

  return (
    <PageShell topSlot={<FloatingTopControls hasLivePulse={obligations.some(obligation => !obligation.is_fulfilled_this_cycle)} />}>
      <SummaryCard
        eyebrow="Recurring Commitments"
        eyebrowIcon={<HandCoins size={12} strokeWidth={2.2} />}
        status={`${completedThisCycle}/${obligations.length} done`}
        value={formatCurrency(totalEstimatedMonthly)}
        metrics={[
          { label: 'Active obligations', value: obligations.length },
          { label: 'Completed this cycle', value: completedThisCycle },
          { label: 'Estimated monthly load', value: formatCurrency(totalEstimatedMonthly) },
        ]}
        footer="Commitments are tracked to protect weekly and monthly cash flow"
      />

      <SectionCard>
        <SectionHeader
          title="Obligation Queue"
          subtitle="Mark commitments complete as they are fulfilled"
          right={<MetadataChip label={obligations.length ? 'Tracked' : 'Empty'} tone={obligations.length ? 'teal' : 'neutral'} />}
        />

        {obligations.length === 0 ? (
          <EmptyStateCard
            title="No obligations configured"
            description="Add recurring commitments during onboarding or from your money setup flows."
            actionLabel="Open check-in"
            onAction={() => navigate('/checkin')}
          />
        ) : (
          <div className="space-y-3">
            {obligations.map(obligation => {
              const baseAmount = estimateObligationAmount(obligation, incomeAmount)
              const amountText = formatObligationAmountPresentation(obligation, currency)

              return (
                <div key={obligation.id} className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] px-4 py-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[15px] font-semibold text-white">{obligation.name}</h3>
                      <p className="mt-1 text-[12px] text-white/48">{amountText}</p>
                    </div>
                    <MetadataChip
                      label={obligation.is_fulfilled_this_cycle ? 'Done' : 'Pending'}
                      tone={obligation.is_fulfilled_this_cycle ? 'success' : 'attention'}
                    />
                  </div>

                  <div className="mb-3 text-[11px] text-white/55">
                    Estimated monthly impact: {formatCurrency(baseAmount * getObligationMonthlyMultiplier(getObligationCadence(obligation)), currency)}
                  </div>

                  <button
                    type="button"
                    disabled={obligation.is_fulfilled_this_cycle}
                    onClick={() => {
                      markDone.mutate({ id: obligation.id, amount: Number(obligation.amount || 0) })
                      addMessage(`${obligation.name} marked complete for this cycle.`)
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[#74d4a3]/26 bg-[#74d4a3]/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ddfbe] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <CheckCircle2 size={14} />
                    {obligation.is_fulfilled_this_cycle ? 'Completed' : 'Mark done'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <SectionHeader title="Quick Routing" subtitle="Jump to linked workflows" />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => navigate('/money')}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-center text-[12px] font-semibold text-white/82"
          >
            Money hub
          </button>
          <button
            type="button"
            onClick={() => navigate('/checkin')}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-center text-[12px] font-semibold text-white/82"
          >
            Weekly check-in
          </button>
        </div>
      </SectionCard>

      <div className="fixed bottom-28 left-0 right-0 z-50 flex flex-col items-center space-y-2 px-4 pointer-events-none">
        {messages.map((message, index) => (
          <div
            key={`${message}-${index}`}
            className="pointer-events-auto min-w-[220px] rounded-full border border-white/[0.08] bg-[#111418] px-5 py-3 text-[13px] font-medium text-white shadow-[0_18px_45px_rgba(0,0,0,0.42)]"
          >
            {message}
          </div>
        ))}
      </div>

      <div className="h-8" />
    </PageShell>
  )
}
