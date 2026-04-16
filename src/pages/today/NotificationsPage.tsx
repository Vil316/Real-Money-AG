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
import { useSubscriptions } from '@/hooks/useSubscriptions'
import { useTransactions } from '@/hooks/useTransactions'
import { advanceDueDate, formatCurrency, getActionItems } from '@/lib/utils'
import type { ActionItem } from '@/types'
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

function getActionLabel(item: ActionItem): string | undefined {
  if (item.type === 'payday') return 'Log'
  if (item.canMarkPaid) return 'Pay'
  if (item.canMarkDone) return 'Done'
  return undefined
}

function getActionTone(item: ActionItem): 'info' | 'neutral' | 'success' | 'attention' {
  if (item.priority === 'high' || item.priority === 'medium') return 'attention'
  if (item.type === 'payday') return 'info'
  if (item.type === 'all_good') return 'success'
  return 'neutral'
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const { accounts } = useAccounts()
  const { bills, markPaid } = useBills()
  const { subscriptions } = useSubscriptions()
  const { debts } = useDebts()
  const { obligations, markDone } = useObligations()
  const { goals } = useSavings()
  const { incomeEntries, logIncome } = useIncome()
  const { profile } = useProfile()
  const { transactions } = useTransactions()

  const [messages, setMessages] = useState<string[]>([])

  const actionItems = useMemo(
    () => getActionItems({
      bills,
      subscriptions,
      debts,
      obligations,
      savingsGoals: goals,
      incomeEntries,
      profile: profile ?? null,
    }),
    [bills, debts, goals, incomeEntries, obligations, profile, subscriptions],
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

  const handleAction = (item: ActionItem) => {
    if (item.type === 'payday') {
      const paydayAmount = Number(profile?.income_amount || 0)
      logIncome.mutate({ amount: paydayAmount, payment_method: 'bank_transfer' })
      addMessage(`Logged payday income of ${formatCurrency(paydayAmount)}.`)
      return
    }

    if (item.canMarkPaid && item.referenceId) {
      const bill = bills.find(row => row.id === item.referenceId)
      if (!bill) return
      markPaid.mutate({ id: bill.id, nextDueDate: advanceDueDate(bill.next_due_date, bill.frequency) })
      addMessage(`${bill.name} marked as paid.`)
      return
    }

    if (item.canMarkDone && item.referenceId) {
      const obligation = obligations.find(row => row.id === item.referenceId)
      if (!obligation) return
      markDone.mutate({ id: obligation.id, amount: Number(obligation.amount || 0) })
      addMessage(`${obligation.name} marked as complete for this cycle.`)
    }
  }

  const urgentCount = actionItems.filter(item => item.priority === 'high' || item.priority === 'medium').length

  return (
    <PageShell topSlot={<FloatingTopControls hasLivePulse={urgentCount > 0} />}>
      <SummaryCard
        eyebrow="Action Center"
        eyebrowIcon={<Bell size={12} strokeWidth={2.2} />}
        status={urgentCount > 0 ? `${urgentCount} urgent` : 'Stable'}
        value={actionItems.length}
        metrics={[
          { label: 'Urgent actions', value: urgentCount },
          { label: 'Recent events', value: recentEvents.length },
          { label: 'Tracked accounts', value: accounts.length },
        ]}
        footer={urgentCount > 0 ? 'Resolve urgent alerts to stabilize your system state' : 'No urgent alerts, system remains calm'}
      />

      <SectionCard>
        <SectionHeader
          title="Priority Actions"
          subtitle="Tasks generated from your current financial state"
          right={<MetadataChip label={urgentCount > 0 ? 'Needs attention' : 'All good'} tone={urgentCount > 0 ? 'attention' : 'success'} />}
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
                detail={item.description}
                tone={getActionTone(item)}
                actionLabel={getActionLabel(item)}
                onAction={getActionLabel(item) ? () => handleAction(item) : undefined}
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
    </PageShell>
  )
}
