import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, CreditCard, Plus } from 'lucide-react'
import { useDebts } from '@/hooks/useDebts'
import { formatCurrency } from '@/lib/utils'
import {
  EmptyStateCard,
  FloatingTopControls,
  MetadataChip,
  PageShell,
  SectionCard,
  SectionHeader,
  SummaryCard,
  fadeUp,
} from '@/components/design'
import { LogPaymentForm } from '@/components/modals/forms/LogPaymentForm'
import { AddDebtForm } from '@/components/modals/forms/AddDebtForm'

function formatDebtType(type: string) {
  if (type === 'credit_card') return 'Credit Card'
  if (type === 'informal_debt') return 'Informal Debt'
  return type.replace('_', ' ')
}

export function DebtsPage() {
  const navigate = useNavigate()
  const { debts, isLoading } = useDebts()
  const [activeDebtId, setActiveDebtId] = useState<string | null>(null)
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false)

  const totalDebt = debts.reduce((sum, debt) => sum + Number(debt.current_balance), 0)
  const totalOriginal = debts.reduce((sum, debt) => sum + Number(debt.original_balance), 0)
  const overallPaidPct = totalOriginal > 0 ? Math.max(0, Math.min(100, Math.round(((totalOriginal - totalDebt) / totalOriginal) * 100))) : 0
  const highPriorityCount = debts.filter(debt => Number(debt.minimum_payment || 0) > 0).length

  const sortedDebts = useMemo(
    () => [...debts].sort((a, b) => Number(b.current_balance) - Number(a.current_balance)),
    [debts],
  )

  if (isLoading) {
    return (
      <PageShell topSlot={<FloatingTopControls />}>
        <SectionCard>
          <p className="py-8 text-center text-sm font-medium text-white/60">Syncing debts...</p>
        </SectionCard>
      </PageShell>
    )
  }

  return (
    <PageShell topSlot={<FloatingTopControls hasLivePulse={debts.length > 0} />}>
      <SummaryCard
        eyebrow="Debt Control"
        eyebrowIcon={<CreditCard size={12} strokeWidth={2.2} />}
        status={`${overallPaidPct}% repaid`}
        value={formatCurrency(totalDebt)}
        tone={totalDebt > 1000 ? 'danger' : 'teal'}
        metrics={[
          { label: 'Original debt load', value: formatCurrency(totalOriginal) },
          { label: 'Active debts', value: debts.length },
          { label: 'With payment schedule', value: highPriorityCount },
        ]}
        footer="Debt balances and repayment progress are continuously visible"
      />

      <SectionCard>
        <SectionHeader
          title="Debt Runway"
          subtitle={`${debts.length} liabilities being tracked`}
          right={<MetadataChip label={debts.length === 0 ? 'Clear' : 'Active'} tone={debts.length === 0 ? 'success' : 'attention'} />}
        />

        {sortedDebts.length === 0 ? (
          <EmptyStateCard
            title="Debt free"
            description="You have no active debts right now. Keep this runway clear."
            icon={<AlertTriangle size={17} />}
          />
        ) : (
          <div className="space-y-3">
            {sortedDebts.map((debt, index) => {
              const original = Number(debt.original_balance)
              const current = Number(debt.current_balance)
              const minPayment = Number(debt.minimum_payment || 0)
              const pct = original > 0 ? Math.min(100, Math.round(((original - current) / original) * 100)) : 0
              const isSettled = current <= 0

              return (
                <motion.div
                  key={debt.id}
                  variants={fadeUp(index * 0.03, 6)}
                  initial="initial"
                  animate="animate"
                  className="rounded-[24px] border border-white/[0.07] bg-white/[0.03] px-4 pb-4 pt-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-[16px] font-semibold text-white">{debt.creditor_name}</h3>
                      <p className="mt-1 text-[12px] text-white/48">
                        {formatDebtType(debt.type)} · {isSettled ? 'Settled' : `${formatCurrency(current)} remaining`}
                      </p>
                    </div>
                    <MetadataChip
                      label={isSettled ? 'Settled' : `${pct}%`}
                      tone={isSettled ? 'success' : debt.is_interest_free ? 'teal' : 'attention'}
                    />
                  </div>

                  <div className="mb-2 h-2.5 overflow-hidden rounded-full bg-white/[0.08]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ type: 'spring', damping: 24 }}
                      className={`h-full rounded-full ${isSettled ? 'bg-[#74d4a3]' : 'bg-white/58'}`}
                    />
                  </div>

                  <div className="mb-3 flex items-center justify-between text-[11px] text-white/52">
                    <span>
                      {minPayment > 0
                        ? `Min payment ${formatCurrency(minPayment)}`
                        : 'No minimum payment saved'}
                    </span>
                    <span>{debt.is_interest_free ? '0% APR' : `${debt.interest_rate || 0}% APR`}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/debts/${debt.id}`)}
                      className="rounded-2xl border border-white/[0.09] bg-white/[0.03] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/76 transition-colors hover:bg-white/[0.06]"
                    >
                      View details
                    </button>
                    <button
                      type="button"
                      disabled={isSettled}
                      onClick={() => setActiveDebtId(debt.id)}
                      className="rounded-2xl border border-[#d6b27a]/30 bg-[#d6b27a]/11 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#dfc094] transition-colors hover:bg-[#d6b27a]/16 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Log payment
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsAddDebtOpen(true)}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.18] bg-white/[0.02] px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/68 transition-colors hover:bg-white/[0.05]"
        >
          <Plus size={16} />
          Add Debt
        </button>
      </SectionCard>

      <div className="h-6" />

      <LogPaymentForm
        isOpen={!!activeDebtId}
        onClose={() => setActiveDebtId(null)}
        debtId={activeDebtId || ''}
        suggestedAmount={debts.find(debt => debt.id === activeDebtId)?.minimum_payment}
      />
      <AddDebtForm isOpen={isAddDebtOpen} onClose={() => setIsAddDebtOpen(false)} />
    </PageShell>
  )
}
