import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, CreditCard, Flag, RefreshCw } from 'lucide-react'
import { useDebts } from '@/hooks/useDebts'
import { calculateDebtProgress } from '@/lib/debtProgress'
import { formatCurrency } from '@/lib/utils'
import {
  EmptyStateCard,
  FloatingTopControls,
  MetadataChip,
  PageShell,
  SectionCard,
  SectionHeader,
  SummaryCard,
} from '@/components/design'
import { LogPaymentForm } from '@/components/modals/forms/LogPaymentForm'
import { QuickCompleteActionSheet } from '@/components/modals/forms/QuickCompleteActionSheet'
import type { ActionCenterAction } from '@/types'

function formatDebtType(type: string) {
  if (type === 'credit_card') return 'Credit Card'
  if (type === 'informal_debt') return 'Informal Debt'
  return type.replace('_', ' ')
}

export function DebtDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { debts, isLoading, markBNPLPaid } = useDebts()
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [quickCompleteAction, setQuickCompleteAction] = useState<ActionCenterAction | null>(null)

  const debt = debts.find(item => item.id === id)
  const progress = calculateDebtProgress(debt?.original_balance, debt?.current_balance)
  const original = progress.originalBalance
  const current = progress.currentBalance
  const repaidAmount = progress.repaidAmount
  const paidPct = progress.progressPercent
  const barWidth = progress.progressWidth
  const minimumPayment = Number(debt?.minimum_payment || 0)

  useEffect(() => {
    if (!debt) return

    if (debt.creditor_name.toLowerCase().includes('clearpay')) {
      console.info('[debt-detail-page] Clearpay progress runtime values', {
        debtId: debt.id,
        creditor: debt.creditor_name,
        originalBalance: progress.originalBalance,
        currentBalance: progress.currentBalance,
        repaidAmount: progress.repaidAmount,
        progressPercent: progress.progressPercent,
        progressWidth: progress.progressWidth,
      })
    }
  }, [debt, progress.currentBalance, progress.originalBalance, progress.progressPercent, progress.progressWidth, progress.repaidAmount])

  const installmentStatus = useMemo(() => {
    if (!debt?.bnpl_instalments || debt.bnpl_instalments.length === 0) {
      return { paid: 0, total: 0 }
    }

    const paid = debt.bnpl_instalments.filter(instalment => instalment.paid).length
    return { paid, total: debt.bnpl_instalments.length }
  }, [debt?.bnpl_instalments])

  if (isLoading) {
    return (
      <PageShell topSlot={<FloatingTopControls />}>
        <SectionCard>
          <p className="py-8 text-center text-sm font-medium text-white/60">Loading debt details...</p>
        </SectionCard>
      </PageShell>
    )
  }

  if (!debt) {
    return (
      <PageShell topSlot={<FloatingTopControls />}>
        <EmptyStateCard
          title="Debt not found"
          description="This debt may have been removed or is no longer available."
          actionLabel="Back to debts"
          onAction={() => navigate('/debts')}
        />
      </PageShell>
    )
  }

  return (
    <PageShell topSlot={<FloatingTopControls hasLivePulse={current > 0} />}>
      <SummaryCard
        eyebrow="Debt Detail"
        eyebrowIcon={<CreditCard size={12} strokeWidth={2.2} />}
        status={current <= 0 ? 'Settled' : `${paidPct}% repaid`}
        value={formatCurrency(current)}
        tone={current > 1000 ? 'danger' : 'teal'}
        metrics={[
          { label: 'Original balance', value: formatCurrency(original) },
          { label: 'Paid so far', value: formatCurrency(repaidAmount) },
          { label: 'Minimum payment', value: minimumPayment > 0 ? formatCurrency(minimumPayment) : 'Not set' },
        ]}
        footer={`${debt.creditor_name} remains in your repayment runway`}
      />

      <SectionCard>
        <SectionHeader
          title={debt.creditor_name}
          subtitle={`${formatDebtType(debt.type)}${debt.is_interest_free ? ' · 0% APR' : debt.interest_rate ? ` · ${debt.interest_rate}% APR` : ''}`}
          right={<MetadataChip label={current <= 0 ? 'Settled' : 'Active'} tone={current <= 0 ? 'success' : 'attention'} />}
        />

        <div className="mb-2 h-3 overflow-hidden rounded-full bg-white/[0.08]">
          <div className="h-full rounded-full" style={{ width: `${barWidth}%`, backgroundColor: current <= 0 ? '#74d4a3' : 'rgba(255,255,255,0.58)' }} />
        </div>

        <div className="mb-4 flex items-center justify-between text-[12px] text-white/52">
          <span>{paidPct}% paid off</span>
          <span>
            {debt.next_payment_date
              ? `Next due ${format(new Date(debt.next_payment_date), 'dd MMM yyyy')}`
              : 'No due date set'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={current <= 0}
            onClick={() => setIsPaymentOpen(true)}
            className="rounded-2xl border border-[#d6b27a]/30 bg-[#d6b27a]/11 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#dfc094] transition-colors hover:bg-[#d6b27a]/16 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Log payment
          </button>
          <button
            type="button"
            onClick={() => navigate('/transfer')}
            className="rounded-2xl border border-white/[0.09] bg-white/[0.03] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/76 transition-colors hover:bg-white/[0.06]"
          >
            Open transfer flow
          </button>
          <button
            type="button"
            disabled={current <= 0}
            onClick={() => {
              setQuickCompleteAction({
                id: `debt-min:${debt.id}`,
                title: `Set minimum payment for ${debt.creditor_name}`,
                detail: 'Debt prioritization needs an up-to-date minimum payment value.',
                sourceType: 'debt',
                priority: 'missing-setup',
                actionLabel: minimumPayment > 0 ? 'Edit minimum' : 'Set minimum',
                routeHint: `/debts/${debt.id}`,
                callbackHint: 'update_debt_minimum_payment',
              })
            }}
            className="rounded-2xl border border-[#0B8289]/24 bg-[#0B8289]/11 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ddbe0] transition-colors hover:bg-[#0B8289]/16 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {minimumPayment > 0 ? 'Edit minimum' : 'Set minimum'}
          </button>
        </div>
      </SectionCard>

      {debt.type === 'bnpl' && debt.bnpl_instalments && debt.bnpl_instalments.length > 0 ? (
        <SectionCard>
          <SectionHeader
            title="BNPL Instalments"
            subtitle={`${installmentStatus.paid}/${installmentStatus.total} paid`}
            right={<MetadataChip label="Toggle paid" tone="neutral" />}
          />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {debt.bnpl_instalments.map((instalment, index) => (
              <button
                key={`${instalment.due}-${index}`}
                type="button"
                onClick={() => {
                  const updated = debt.bnpl_instalments!.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, paid: !row.paid } : row,
                  )
                  markBNPLPaid.mutate({ debtId: debt.id, instalments: updated })
                }}
                className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                  instalment.paid
                    ? 'border-[#74d4a3]/26 bg-[#74d4a3]/10 text-[#9ddfbe]'
                    : 'border-white/[0.08] bg-white/[0.03] text-white/78'
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">#{index + 1}</p>
                <p className="mt-1 text-[13px] font-semibold">{formatCurrency(Number(instalment.amount))}</p>
                <p className="mt-1 text-[11px] text-inherit/80">{format(new Date(instalment.due), 'dd MMM')}</p>
              </button>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard>
        <SectionHeader title="Repayment Notes" subtitle="Operational details for this debt" />
        <div className="space-y-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 text-[12px] text-white/62">
          <p className="flex items-center gap-2">
            <Flag size={14} className="text-white/55" />
            Type: {formatDebtType(debt.type)}
          </p>
          <p className="flex items-center gap-2">
            <RefreshCw size={14} className="text-white/55" />
            Payment cadence: {debt.payment_frequency || 'Not set'}
          </p>
          <p>{debt.notes || 'No notes recorded for this debt.'}</p>
        </div>
      </SectionCard>

      <button
        type="button"
        onClick={() => navigate('/debts')}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.09] bg-white/[0.03] px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/76 transition-colors hover:bg-white/[0.06]"
      >
        <ArrowLeft size={16} />
        Back to debts
      </button>

      <div className="h-6" />

      <LogPaymentForm
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        debtId={debt.id}
        suggestedAmount={debt.minimum_payment}
      />
      <QuickCompleteActionSheet
        isOpen={!!quickCompleteAction}
        action={quickCompleteAction}
        debts={debts}
        obligations={[]}
        savingsGoals={[]}
        onClose={() => setQuickCompleteAction(null)}
        onCompleted={(message) => {
          console.info('[debt-detail-page] Minimum payment quick flow completed', {
            message,
            actionId: quickCompleteAction?.id,
          })
        }}
      />
    </PageShell>
  )
}
