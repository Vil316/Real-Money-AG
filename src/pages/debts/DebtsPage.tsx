import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { AlertTriangle, CreditCard, Plus } from 'lucide-react'
import { useDebts } from '@/hooks/useDebts'
import { calculateDebtProgress } from '@/lib/debtProgress'
import { formatCurrency } from '@/lib/utils'
import { QuickCompleteActionSheet } from '@/components/modals/forms/QuickCompleteActionSheet'
import type { ActionCenterAction } from '@/types'
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

function toSafeNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseIsoDateSafe(value?: string | null): Date | null {
  if (!value) return null
  const parsed = parseISO(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

type DebtPriorityKind = 'due_soon' | 'missing_minimum' | 'near_payoff' | 'highest_balance'

type PrioritizedDebt = {
  debtId: string
  debt: ReturnType<typeof useDebts>['debts'][number]
  priorityKind: DebtPriorityKind
  priorityRank: number
  priorityReason: string
  dueDays: number | null
  isDueSoon: boolean
  isUpcoming: boolean
  isNearPayoff: boolean
  hasMissingMinimum: boolean
  currentBalance: number
  minimumPayment: number
}

function formatDueSignal(days: number | null): string {
  if (days === null) return 'No due date set'
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `Due in ${days}d`
}

export function DebtsPage() {
  const navigate = useNavigate()
  const { debts, isLoading } = useDebts()
  const [activeDebtId, setActiveDebtId] = useState<string | null>(null)
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false)
  const [quickCompleteAction, setQuickCompleteAction] = useState<ActionCenterAction | null>(null)

  const totalDebt = debts.reduce((sum, debt) => sum + toSafeNumber(debt.current_balance), 0)
  const totalOriginal = debts.reduce((sum, debt) => sum + toSafeNumber(debt.original_balance), 0)
  const totalProgress = calculateDebtProgress(totalOriginal, totalDebt)
  const overallPaidPct = totalProgress.progressPercent

  const prioritizedDebts = useMemo<PrioritizedDebt[]>(() => {
    const today = new Date()

    return debts
      .map((debt) => {
        const currentBalance = toSafeNumber(debt.current_balance)
        const originalBalance = Math.max(toSafeNumber(debt.original_balance), 0)
        const minimumPayment = toSafeNumber(debt.minimum_payment)
        const dueDate = parseIsoDateSafe(debt.next_payment_date)
        const dueDays = dueDate ? differenceInCalendarDays(dueDate, today) : null
        const isDueSoon = dueDays !== null && dueDays <= 7
        const isUpcoming = dueDays !== null && dueDays >= 8 && dueDays <= 21
        const hasMissingMinimum = minimumPayment <= 0
        const nearPayoffThreshold = Math.max(minimumPayment > 0 ? minimumPayment * 3 : 0, 200)
        const paidPct = calculateDebtProgress(originalBalance, currentBalance).progressPercent
        const isNearPayoff = currentBalance > 0 && (currentBalance <= nearPayoffThreshold || paidPct >= 85)

        if (isDueSoon) {
          return {
            debtId: debt.id,
            debt,
            priorityKind: 'due_soon' as const,
            priorityRank: 1,
            priorityReason: dueDays !== null && dueDays < 0 ? 'Overdue payment needs review' : 'Payment due soon',
            dueDays,
            isDueSoon,
            isUpcoming,
            isNearPayoff,
            hasMissingMinimum,
            currentBalance,
            minimumPayment,
          }
        }

        if (hasMissingMinimum) {
          return {
            debtId: debt.id,
            debt,
            priorityKind: 'missing_minimum' as const,
            priorityRank: 2,
            priorityReason: 'Minimum payment info missing',
            dueDays,
            isDueSoon,
            isUpcoming,
            isNearPayoff,
            hasMissingMinimum,
            currentBalance,
            minimumPayment,
          }
        }

        if (isNearPayoff) {
          return {
            debtId: debt.id,
            debt,
            priorityKind: 'near_payoff' as const,
            priorityRank: 3,
            priorityReason: 'Close to payoff',
            dueDays,
            isDueSoon,
            isUpcoming,
            isNearPayoff,
            hasMissingMinimum,
            currentBalance,
            minimumPayment,
          }
        }

        return {
          debtId: debt.id,
          debt,
          priorityKind: 'highest_balance' as const,
          priorityRank: 4,
          priorityReason: 'Highest balance awareness',
          dueDays,
          isDueSoon,
          isUpcoming,
          isNearPayoff,
          hasMissingMinimum,
          currentBalance,
          minimumPayment,
        }
      })
      .sort((a, b) => {
        if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank

        if (a.priorityKind === 'due_soon' && b.priorityKind === 'due_soon') {
          if (a.dueDays === null && b.dueDays === null) return 0
          if (a.dueDays === null) return 1
          if (b.dueDays === null) return -1
          return a.dueDays - b.dueDays
        }

        if (a.priorityKind === 'near_payoff' && b.priorityKind === 'near_payoff') {
          return a.currentBalance - b.currentBalance
        }

        return b.currentBalance - a.currentBalance
      })
  }, [debts])

  const sortedDebts = useMemo(() => prioritizedDebts.map(item => item.debt), [prioritizedDebts])
  const topPriorityDebt = prioritizedDebts[0] ?? null
  const needsReviewCount = prioritizedDebts.filter(item => item.isDueSoon || item.hasMissingMinimum).length
  const dueSoonCount = prioritizedDebts.filter(item => item.isDueSoon).length
  const upcomingDueCount = prioritizedDebts.filter(item => item.isUpcoming).length
  const missingMinimumCount = prioritizedDebts.filter(item => item.hasMissingMinimum).length
  const nearPayoffCount = prioritizedDebts.filter(item => item.isNearPayoff).length
  const highestBalanceDebt = prioritizedDebts.reduce<PrioritizedDebt | null>((highest, current) => {
    if (!highest) return current
    return current.currentBalance > highest.currentBalance ? current : highest
  }, null)
  const closestPayoffDebt = prioritizedDebts
    .filter(item => item.currentBalance > 0)
    .reduce<PrioritizedDebt | null>((closest, current) => {
      if (!closest) return current
      return current.currentBalance < closest.currentBalance ? current : closest
    }, null)

  const supportStatusLine =
    dueSoonCount > 0
      ? `${dueSoonCount} due soon`
      : missingMinimumCount > 0
        ? `${missingMinimumCount} missing minimum`
        : nearPayoffCount > 0
          ? `${nearPayoffCount} near payoff`
          : debts.length > 0
            ? 'Priority stack ready'
            : 'No active debt pressure'

  const topPriorityLine = topPriorityDebt
    ? `Review first: ${topPriorityDebt.debt.creditor_name} (${topPriorityDebt.priorityReason.toLowerCase()}${topPriorityDebt.dueDays !== null ? `, ${formatDueSignal(topPriorityDebt.dueDays).toLowerCase()}` : ''}).`
    : 'No active debt needs review right now.'

  const balanceSignalLine = `${closestPayoffDebt
    ? `Closest payoff: ${closestPayoffDebt.debt.creditor_name} (${formatCurrency(closestPayoffDebt.currentBalance)}).`
    : 'Closest payoff: none.'} ${highestBalanceDebt
      ? `Highest balance: ${highestBalanceDebt.debt.creditor_name} (${formatCurrency(highestBalanceDebt.currentBalance)}).`
      : 'Highest balance: none.'}`

  useEffect(() => {
    const debugRows = debts.map((debt) => {
      const progress = calculateDebtProgress(debt.original_balance, debt.current_balance)
      return {
        debtId: debt.id,
        creditor: debt.creditor_name,
        originalBalance: progress.originalBalance,
        currentBalance: progress.currentBalance,
        repaidAmount: progress.repaidAmount,
        progressPercent: progress.progressPercent,
        progressWidth: progress.progressWidth,
      }
    })

    const clearpayRows = debugRows.filter((row) => row.creditor.toLowerCase().includes('clearpay'))

    if (clearpayRows.length > 0) {
      console.info('[debts-page] Clearpay progress runtime values', {
        summary: {
          totalOriginal,
          totalCurrent: totalDebt,
          repaidAmount: totalProgress.repaidAmount,
          progressPercent: totalProgress.progressPercent,
          progressWidth: totalProgress.progressWidth,
          overallPaidPctLabel: overallPaidPct,
        },
        debts: clearpayRows,
      })
    }
  }, [debts, overallPaidPct, totalDebt, totalOriginal, totalProgress.progressPercent, totalProgress.progressWidth, totalProgress.repaidAmount])

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
        eyebrow="Debt Priorities"
        eyebrowIcon={<CreditCard size={12} strokeWidth={2.2} />}
        status={supportStatusLine}
        value={formatCurrency(totalDebt)}
        tone={dueSoonCount > 0 || missingMinimumCount > 0 ? 'danger' : totalDebt > 1000 ? 'danger' : 'teal'}
        metrics={[
          { label: 'Needs review', value: needsReviewCount },
          { label: 'Due in 7 days', value: dueSoonCount },
          { label: 'Missing minimum', value: missingMinimumCount },
          { label: 'Repaid progress', value: `${overallPaidPct}%` },
        ]}
        footer={`${topPriorityLine} ${balanceSignalLine}`}
      />

      <SectionCard>
        <SectionHeader
          title="Debt Runway"
          subtitle={`${debts.length} liabilities tracked${needsReviewCount > 0 ? ` · ${needsReviewCount} need review first` : ''}${upcomingDueCount > 0 ? ` · ${upcomingDueCount} upcoming` : ''}`}
          right={
            <MetadataChip
              label={debts.length === 0 ? 'Clear' : needsReviewCount > 0 ? 'Review' : 'Active'}
              tone={debts.length === 0 ? 'success' : needsReviewCount > 0 ? 'attention' : 'teal'}
            />
          }
        />

        {sortedDebts.length === 0 ? (
          <EmptyStateCard
            title="Debt free"
            description="You have no active debts right now. Keep this runway clear."
            icon={<AlertTriangle size={17} />}
          />
        ) : (
          <div className="space-y-3">
            {prioritizedDebts.map((item, index) => {
              const { debt } = item
              const original = toSafeNumber(debt.original_balance)
              const current = toSafeNumber(debt.current_balance)
              const minPayment = item.minimumPayment
              const progress = calculateDebtProgress(original, current)
                const pct = progress.progressPercent
                const barWidth = progress.progressWidth
              const isSettled = current <= 0

              return (
                <motion.div
                  key={item.debtId}
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
                      label={isSettled ? 'Settled' : index === 0 ? 'Review first' : item.isNearPayoff ? 'Near payoff' : `${pct}%`}
                      tone={isSettled ? 'success' : index === 0 ? 'attention' : debt.is_interest_free ? 'teal' : 'attention'}
                    />
                  </div>

                  <div className="mb-2 h-2.5 overflow-hidden rounded-full bg-white/[0.08]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${barWidth}%`, backgroundColor: isSettled ? '#74d4a3' : 'rgba(255,255,255,0.58)' }}
                      />
                  </div>

                  <div className="mb-1 flex items-center justify-between text-[11px] text-white/52">
                    <span>
                      {minPayment > 0
                        ? `Min payment ${formatCurrency(minPayment)}`
                        : 'Minimum payment missing'}
                    </span>
                    <span>{debt.is_interest_free ? '0% APR' : `${debt.interest_rate || 0}% APR`}</span>
                  </div>

                  <div className="mb-3 flex items-center justify-between text-[11px] text-white/45">
                    <span>{item.priorityReason}</span>
                    <span>{formatDueSignal(item.dueDays)}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
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
                    <button
                      type="button"
                      disabled={isSettled}
                      onClick={() => {
                        setQuickCompleteAction({
                          id: `debt-min:${debt.id}`,
                          title: `Set minimum payment for ${debt.creditor_name}`,
                          detail: 'Debt prioritization needs an up-to-date minimum payment value.',
                          sourceType: 'debt',
                          priority: 'missing-setup',
                          actionLabel: minPayment > 0 ? 'Edit minimum' : 'Set minimum',
                          routeHint: `/debts/${debt.id}`,
                          callbackHint: 'update_debt_minimum_payment',
                        })
                      }}
                      className="rounded-2xl border border-[#0B8289]/24 bg-[#0B8289]/11 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ddbe0] transition-colors hover:bg-[#0B8289]/16 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {minPayment > 0 ? 'Edit minimum' : 'Set minimum'}
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
      <QuickCompleteActionSheet
        isOpen={!!quickCompleteAction}
        action={quickCompleteAction}
        debts={debts}
        obligations={[]}
        savingsGoals={[]}
        onClose={() => setQuickCompleteAction(null)}
        onCompleted={(message) => {
          console.info('[debts-page] Minimum payment quick flow completed', {
            message,
            actionId: quickCompleteAction?.id,
          })
        }}
      />
      <AddDebtForm isOpen={isAddDebtOpen} onClose={() => setIsAddDebtOpen(false)} />
    </PageShell>
  )
}
