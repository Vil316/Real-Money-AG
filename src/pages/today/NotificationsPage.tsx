import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Bell, BellRing, CalendarClock, CheckCircle2, ListTodo } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAccounts } from '@/hooks/useAccounts'
import { useBills } from '@/hooks/useBills'
import { useDebts } from '@/hooks/useDebts'
import { useIncome } from '@/hooks/useIncome'
import { useObligations } from '@/hooks/useObligations'
import { useProfile } from '@/hooks/useProfile'
import { useSavings } from '@/hooks/useSavings'
import { useTransactions } from '@/hooks/useTransactions'
import { QuickCompleteActionSheet } from '@/components/modals/forms/QuickCompleteActionSheet'
import { buildActionCenterModel } from '@/lib/actionCenter'
import { evaluateSetupCompleteness } from '@/lib/setupCompleteness'
import { evaluateWeeklyPressure } from '@/lib/weeklyPressure'
import { advanceDueDate, calculateSafeToSpend, formatCurrency } from '@/lib/utils'
import type { ActionCenterAction } from '@/types'
import {
  ActionRow,
  EmptyStateCard,
  FloatingTopControls,
  MetadataChip,
  PageShell,
  PremiumListRow,
  SectionCard,
  SectionHeader,
  SummaryCard,
} from '@/components/design'

function getActionTone(item: ActionCenterAction): 'info' | 'neutral' | 'success' | 'attention' {
  if (item.priority === 'urgent' || item.priority === 'due-soon') return 'attention'
  if (item.priority === 'missing-setup') return 'info'
  if (item.priority === 'reassurance') return 'success'
  return 'neutral'
}

function extractEntityId(actionId: string, prefix: string): string | null {
  const fullPrefix = `${prefix}:`
  if (!actionId.startsWith(fullPrefix)) return null

  const id = actionId.slice(fullPrefix.length).trim()
  return id.length > 0 ? id : null
}

function isQuickCompleteCallback(callbackHint: string | undefined): boolean {
  return callbackHint === 'update_debt_minimum_payment'
    || callbackHint === 'set_debt_payment_date'
    || callbackHint === 'set_obligation_due_date'
    || callbackHint === 'set_weekly_contribution'
    || callbackHint === 'log_income'
}

function buildConfidenceImpactLine(impact: {
  weakensSafeToSpend: boolean
  weakensPrioritization: boolean
  weakensTrust: boolean
}): string {
  if (impact.weakensSafeToSpend && impact.weakensPrioritization) {
    return 'Cash and priority guidance still need setup confidence.'
  }

  if (impact.weakensSafeToSpend) {
    return 'Cash guidance is still building confidence.'
  }

  if (impact.weakensPrioritization) {
    return 'Priority guidance is still building confidence.'
  }

  if (impact.weakensTrust) {
    return 'Setup confidence is still stabilizing.'
  }

  return 'Setup confidence is stable.'
}

function buildSetupTrustSummary(params: {
  trustLevel: 'low' | 'medium' | 'high'
  missingItemsCount: number
  blockingItemsCount: number
  impactLine: string
}): string {
  if (params.trustLevel === 'high' && params.missingItemsCount === 0) {
    return 'Setup confidence is strong and action guidance is clear.'
  }

  if (params.trustLevel === 'low' || params.blockingItemsCount > 0) {
    return `Setup confidence is low. ${params.blockingItemsCount} key item${params.blockingItemsCount === 1 ? '' : 's'} still need attention.`
  }

  if (params.missingItemsCount > 0) {
    return `Setup confidence is building. ${params.missingItemsCount} setup item${params.missingItemsCount === 1 ? '' : 's'} still open.`
  }

  return params.impactLine
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const { accounts } = useAccounts()
  const { bills, markPaid } = useBills()
  const { debts } = useDebts()
  const { obligations, markDone } = useObligations()
  const { goals } = useSavings()
  const { incomeEntries } = useIncome()
  const { profile } = useProfile()
  const { transactions } = useTransactions()

  const [messages, setMessages] = useState<string[]>([])
  const [quickCompleteAction, setQuickCompleteAction] = useState<ActionCenterAction | null>(null)

  const safeData = useMemo(
    () => calculateSafeToSpend({ accounts, bills, obligations, debts, profile }),
    [accounts, bills, debts, obligations, profile],
  )

  const pressureData = useMemo(
    () => evaluateWeeklyPressure({ bills, obligations, debts, safeToSpend: safeData.safeToSpend }),
    [bills, debts, obligations, safeData.safeToSpend],
  )

  const actionCenterModel = useMemo(
    () => buildActionCenterModel({
      bills,
      obligations,
      debts,
      savingsGoals: goals,
      incomeEntries,
      profile: profile ?? null,
      safeToSpend: safeData.safeToSpend,
      weeklyPressure: pressureData,
      includeReassurance: true,
    }),
    [bills, debts, goals, incomeEntries, obligations, pressureData, profile, safeData.safeToSpend],
  )

  const setupCompleteness = useMemo(
    () => evaluateSetupCompleteness({
      accounts,
      debts,
      obligations,
      savingsGoals: goals,
      incomeEntries,
      profile: profile ?? null,
    }),
    [accounts, debts, goals, incomeEntries, obligations, profile],
  )

  const setupImpactLine = useMemo(
    () => buildConfidenceImpactLine(setupCompleteness.confidenceImpact),
    [setupCompleteness.confidenceImpact],
  )

  const actionItems = useMemo(
    () => actionCenterModel.actions,
    [actionCenterModel.actions],
  )

  const recentEvents = useMemo(
    () => transactions
      .filter(transaction => (transaction.merchant_clean || transaction.merchant_raw || '').trim().length > 0)
      .slice(0, 8),
    [transactions],
  )

  const addMessage = (text: string) => {
    setMessages(prev => [...prev, text])
    setTimeout(() => setMessages(prev => prev.slice(1)), 2800)
  }

  const handleAction = (item: ActionCenterAction) => {
    if (isQuickCompleteCallback(item.callbackHint)) {
      setQuickCompleteAction(item)
      return
    }

    if (item.callbackHint === 'mark_bill_paid') {
      const billId = extractEntityId(item.id, 'bill')
      const bill = billId ? bills.find(row => row.id === billId) : undefined
      if (!bill) return

      markPaid.mutate({ id: bill.id, nextDueDate: advanceDueDate(bill.next_due_date, bill.frequency) })
      addMessage(`${bill.name} marked as paid.`)
      return
    }

    if (item.callbackHint === 'mark_obligation_done') {
      const obligationId = extractEntityId(item.id, 'obligation')
      const obligation = obligationId ? obligations.find(row => row.id === obligationId) : undefined
      if (!obligation) return

      markDone.mutate({ id: obligation.id, amount: Number(obligation.amount || 0) })
      addMessage(`${obligation.name} marked as complete for this cycle.`)
      return
    }

    if (item.routeHint) {
      navigate(item.routeHint)
      return
    }

    if (item.sourceType === 'review') {
      navigate('/checkin')
    }
  }

  const urgentCount = actionCenterModel.counts.urgent
  const dueSoonCount = actionCenterModel.counts.dueSoon
  const missingSetupCount = actionCenterModel.counts.missingSetup
  const planningCount = actionCenterModel.counts.planning
  const activeAttentionCount = urgentCount + dueSoonCount
  const trustPhrase = setupCompleteness.trustLevel === 'high'
    ? 'Confidence strong'
    : setupCompleteness.trustLevel === 'medium'
      ? 'Confidence building'
      : 'Confidence needs setup'
  const setupSummaryLine = buildSetupTrustSummary({
    trustLevel: setupCompleteness.trustLevel,
    missingItemsCount: setupCompleteness.missingItemsCount,
    blockingItemsCount: setupCompleteness.blockingItems.length,
    impactLine: setupImpactLine,
  })
  const setupChipLabel = activeAttentionCount > 0
    ? 'Needs attention'
    : setupCompleteness.trustLevel === 'low'
      ? 'Setup first'
      : setupCompleteness.trustLevel === 'medium'
        ? 'Steady'
        : 'Ready'
  const setupChipTone: 'attention' | 'neutral' | 'success' = activeAttentionCount > 0 || setupCompleteness.trustLevel === 'low'
    ? 'attention'
    : setupCompleteness.trustLevel === 'medium'
      ? 'neutral'
      : 'success'

  return (
    <PageShell topSlot={<FloatingTopControls hasLivePulse={activeAttentionCount > 0} />}>
      <SummaryCard
        eyebrow="Action Center"
        eyebrowIcon={<Bell size={12} strokeWidth={2.2} />}
        status={urgentCount > 0 ? `${urgentCount} urgent` : dueSoonCount > 0 ? `${dueSoonCount} due soon` : trustPhrase}
        value={actionItems.length}
        metrics={[
          { label: 'Urgent actions', value: urgentCount },
          { label: 'Due soon', value: dueSoonCount },
          { label: 'Setup actions', value: missingSetupCount },
        ]}
        footer={setupSummaryLine}
      />

      <SectionCard>
        <SectionHeader
          title="Priority Actions"
          subtitle={`${actionItems.length} actions · U:${urgentCount} D:${dueSoonCount} S:${missingSetupCount} P:${planningCount}`}
          right={<MetadataChip label={setupChipLabel} tone={setupChipTone} />}
        />

        {actionItems.length === 0 ? (
          <EmptyStateCard
            title="No actions"
            description="All action queues are currently empty."
          />
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {actionItems.map((item, index) => (
              <ActionRow
                key={item.id}
                title={item.title}
                detail={item.detail}
                tone={getActionTone(item)}
                actionLabel={item.actionLabel}
                onAction={() => handleAction(item)}
                index={index}
              />
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <SectionHeader
          title="Live Ledger Events"
          subtitle="Latest activity from connected and manual ledgers"
          right={<MetadataChip label="Live" tone="teal" />}
        />

        {recentEvents.length === 0 ? (
          <EmptyStateCard
            title="No recent events"
            description="Transaction events will show up here once activity starts flowing."
            icon={<CalendarClock size={17} />}
          />
        ) : (
          <div className="divide-y divide-white/[0.055]">
            {recentEvents.map(transaction => {
              const amount = Number(transaction.amount)
              const title = transaction.merchant_clean || transaction.merchant_raw
              return (
                <PremiumListRow
                  key={transaction.id}
                  title={title}
                  subtitle={format(new Date(transaction.date), 'dd MMM yyyy')}
                  amount={`${amount > 0 ? '+' : ''}${formatCurrency(amount, transaction.currency)}`}
                  tone={amount > 0 ? 'income' : 'expense'}
                />
              )
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <SectionHeader title="Shortcuts" subtitle="Jump directly to operational pages" />
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => navigate('/obligations')}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-2 py-2 text-center text-[11px] font-semibold text-white/82"
          >
            <ListTodo size={15} className="mx-auto mb-1 text-white/70" />
            Obligations
          </button>
          <button
            type="button"
            onClick={() => navigate('/transfer')}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-2 py-2 text-center text-[11px] font-semibold text-white/82"
          >
            <BellRing size={15} className="mx-auto mb-1 text-white/70" />
            Transfer
          </button>
          <button
            type="button"
            onClick={() => navigate('/money')}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-2 py-2 text-center text-[11px] font-semibold text-white/82"
          >
            <CheckCircle2 size={15} className="mx-auto mb-1 text-white/70" />
            Money
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

      <QuickCompleteActionSheet
        isOpen={!!quickCompleteAction}
        action={quickCompleteAction}
        debts={debts}
        obligations={obligations}
        savingsGoals={goals}
        defaultIncomeAmount={Number(profile?.income_amount || 0)}
        onClose={() => setQuickCompleteAction(null)}
        onCompleted={(message) => addMessage(message)}
      />
    </PageShell>
  )
}
