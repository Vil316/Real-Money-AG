import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn, formatCurrency, calculateSafeToSpend, getActionItems, advanceDueDate } from '@/lib/utils'
import { useAccounts } from '@/hooks/useAccounts'
import { useBills } from '@/hooks/useBills'
import { useObligations } from '@/hooks/useObligations'
import { useSubscriptions } from '@/hooks/useSubscriptions'
import { useDebts } from '@/hooks/useDebts'
import { useSavings } from '@/hooks/useSavings'
import { useIncome } from '@/hooks/useIncome'
import { useProfile } from '@/hooks/useProfile'
import { useTransactions } from '@/hooks/useTransactions'
import type { ActionItem, FrequencyType } from '@/types'
import { Bell, Link2, Plus, Shield, Sparkles } from 'lucide-react'
import { motion, AnimatePresence, useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion'
import { differenceInCalendarDays, endOfWeek, format, isToday, isYesterday, parseISO } from 'date-fns'
import { ProfileDrawer } from '@/components/modals/ProfileDrawer'
import { AddMenuDrawer } from '@/components/modals/AddMenuDrawer'
import { AddAccountForm } from '@/components/modals/forms/AddAccountForm'
import { AddBillForm } from '@/components/modals/forms/AddBillForm'
import { AddDebtForm } from '@/components/modals/forms/AddDebtForm'
import { AddGoalForm } from '@/components/modals/forms/AddGoalForm'
import { FloatingIconButton } from '@/components/today/FloatingIconButton'
import { AnimatedHeroAmount } from '@/components/today/AnimatedHeroAmount'
import { ActionFeedRow } from '@/components/today/ActionFeedRow'

type SystemFeedRow = {
  id: string
  title: string
  detail: string
  tone?: 'info' | 'neutral' | 'success' | 'attention'
  actionLabel?: string
  onAction?: () => void
}

type UpcomingRow = {
  id: string
  title: string
  detail: string
}

function getFrequencyLabel(frequency: FrequencyType): string {
  switch (frequency) {
    case 'weekly':
      return 'Weekly'
    case 'monthly':
      return 'Monthly'
    case 'quarterly':
      return 'Quarterly'
    case 'annual':
      return 'Annual'
    default:
      return 'One-off'
  }
}

function formatActivityTime(date: string): string {
  const value = parseISO(date)

  if (isToday(value)) {
    return format(value, 'HH:mm')
  }

  if (isYesterday(value)) {
    return 'Yesterday'
  }

  return format(value, 'dd MMM')
}

function buildSystemStatus(protectedAmount: number, upcomingCount: number): string {
  if (protectedAmount <= 0 && upcomingCount === 0) {
    return 'No cash pressure in next 7 days'
  }

  if (upcomingCount === 0) {
    return `${formatCurrency(protectedAmount)} ring-fenced with no urgent cash events`
  }

  return `${upcomingCount} commitment${upcomingCount === 1 ? '' : 's'} covered in the next 7 days`
}

function getActionButtonLabel(item: ActionItem): string | undefined {
  if (item.type === 'payday') return 'Log'
  if (item.canMarkPaid) return 'Pay'
  if (item.canMarkDone) return 'Done'
  return undefined
}

export function TodayPage() {
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion()
  const { scrollY } = useScroll()

  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [activeActionForm, setActiveActionForm] = useState<string | null>(null)
  const [isTopClusterCondensed, setIsTopClusterCondensed] = useState(false)

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const next = latest > 24
    setIsTopClusterCondensed((previous) => (previous === next ? previous : next))
  })
  
  const { accounts } = useAccounts()
  const { bills, markPaid } = useBills()
  const { subscriptions } = useSubscriptions()
  const { debts } = useDebts()
  const { obligations, markDone } = useObligations()
  const { goals: savingsGoals } = useSavings()
  const { incomeEntries, logIncome } = useIncome()
  const { transactions } = useTransactions()

  const { profile } = useProfile()

  const safeData = calculateSafeToSpend({ accounts, bills, obligations, debts })

  const actionItems = getActionItems({
    bills, subscriptions, debts, obligations, savingsGoals, incomeEntries, profile: profile ?? null
  })

  const sortedAccounts = [...accounts].sort((left, right) => Number(right.balance) - Number(left.balance))
  const visibleAccounts = sortedAccounts.slice(0, 4)
  const transactionsWithTitle = transactions.filter((transaction) => {
    const transactionTitle = (transaction.merchant_clean || transaction.merchant_raw || '').trim()
    return transactionTitle.length > 0
  })
  const visibleTransactions = transactionsWithTitle.slice(0, 4)
  const linkedAccount = accounts.find(account => account.is_linked || !!account.provider)
  const expensesToday = transactions.filter(transaction => isToday(parseISO(transaction.date)) && Number(transaction.amount) < 0)
  const urgentAction = actionItems.find(item => item.id !== 'all_good' && item.type !== 'all_good')
  const upcomingBills = [...bills]
    .filter(bill => !bill.is_paid_this_cycle)
    .sort((left, right) => left.next_due_date.localeCompare(right.next_due_date))
  const nextBill = upcomingBills[0]
  const nextBillDays = nextBill
    ? differenceInCalendarDays(parseISO(nextBill.next_due_date), new Date())
    : null
  const nextSubscription = [...subscriptions]
    .filter(subscription => subscription.status === 'active')
    .sort((left, right) => left.next_billing_date.localeCompare(right.next_billing_date))[0]
  const weeklyReviewDays = Math.max(
    differenceInCalendarDays(endOfWeek(new Date(), { weekStartsOn: 1 }), new Date()),
    0,
  )
  const nextRecurringDays = nextSubscription
    ? Math.max(differenceInCalendarDays(parseISO(nextSubscription.next_billing_date), new Date()), 0)
    : null
  const recentCommitmentCount = bills.filter(bill => !bill.is_paid_this_cycle && differenceInCalendarDays(parseISO(bill.next_due_date), new Date()) <= 7).length +
    obligations.filter(obligation => !obligation.is_fulfilled_this_cycle && obligation.amount_type === 'fixed').length +
    debts.filter(debt => !debt.is_settled && debt.next_payment_date && differenceInCalendarDays(parseISO(debt.next_payment_date), new Date()) <= 7).length
  const systemStatus = buildSystemStatus(safeData.protectedBills + safeData.protectedObs, recentCommitmentCount)
  const profileInitial = profile?.display_name?.charAt(0).toUpperCase() ?? 'R'
  const hasNewActivity = expensesToday.length > 0 || !!urgentAction
  const topPillText = hasNewActivity ? 'Live updates' : 'System stable'

  const [toasts, setToasts] = useState<string[]>([])

  const handleAction = (item: ActionItem) => {
    if (item.type === 'payday') {
      logIncome.mutate({ amount: profile?.income_amount || 0, payment_method: 'bank_transfer' })
      toast("Income logged! ✓")
    } else if (item.canMarkPaid) {
      if (item.referenceId) {
        const bill = bills.find(b => b.id === item.referenceId)
        if (bill) {
          markPaid.mutate({ id: bill.id, nextDueDate: advanceDueDate(bill.next_due_date, bill.frequency) })
          toast(`${bill.name} marked paid`)
        }
      }
    } else if (item.canMarkDone) {
      if (item.referenceId) {
        const ob = obligations.find(o => o.id === item.referenceId)
        if (ob) {
          markDone.mutate({ id: ob.id, amount: ob.amount || 0 })
          toast(`${ob.name} marked done`)
        }
      }
    }
  }

  const toast = (msg: string) => {
    setToasts(prev => [...prev, msg])
    setTimeout(() => setToasts(prev => prev.slice(1)), 3000)
  }

  const systemFeed: SystemFeedRow[] = [
    linkedAccount
      ? {
          id: 'linked-account',
          title: `${linkedAccount.name} linked successfully`,
          detail: 'Connection healthy and ready for sync',
          tone: 'success',
        }
      : {
          id: 'tracking-ready',
          title: `${accounts.length || 0} account${accounts.length === 1 ? '' : 's'} under watch`,
          detail: 'Financial system is monitoring your cash position',
          tone: 'neutral',
        },
    expensesToday.length > 0
      ? {
          id: 'expenses-today',
          title: `${expensesToday.length} new expense${expensesToday.length === 1 ? '' : 's'} logged today`,
          detail: 'Recent spending is already reflected in Safe to Spend',
          tone: 'info',
        }
      : {
          id: 'quiet-ledger',
          title: 'No new expenses logged today',
          detail: 'Your ledger has been quiet since the last review',
          tone: 'neutral',
        },
    urgentAction
      ? {
          id: urgentAction.id,
          title: urgentAction.title,
          detail: urgentAction.description,
          tone: urgentAction.priority === 'high' || urgentAction.priority === 'medium' ? 'attention' : 'info',
          actionLabel: getActionButtonLabel(urgentAction),
          onAction: () => handleAction(urgentAction),
        }
      : {
          id: 'no-urgent-action',
          title: 'No urgent action needed',
          detail: 'All near-term obligations are covered right now',
          tone: 'success',
        },
  ]

  const comingUp: UpcomingRow[] = [
    nextBill && nextBillDays === 0
      ? {
          id: 'bill-today',
          title: `${nextBill.name} due today`,
          detail: `${formatCurrency(nextBill.amount)} scheduled from ${getFrequencyLabel(nextBill.frequency)}`,
        }
      : nextBill && nextBillDays != null && nextBillDays < 0
        ? {
            id: 'bill-overdue',
            title: `${nextBill.name} overdue by ${Math.abs(nextBillDays)} day${Math.abs(nextBillDays) === 1 ? '' : 's'}`,
            detail: `${formatCurrency(nextBill.amount)} needs attention in the payment queue`,
          }
      : {
          id: 'no-bill-today',
          title: 'No bill due today',
          detail: nextBill
            ? `${nextBill.name} lands ${nextBillDays} day${nextBillDays === 1 ? '' : 's'} from now`
            : 'No pending bills are scheduled at the moment',
        },
    {
      id: 'weekly-review',
      title: `Weekly review due in ${weeklyReviewDays} day${weeklyReviewDays === 1 ? '' : 's'}`,
      detail: 'Close the week with a system-level cash check',
    },
    nextSubscription
      ? {
          id: 'next-recurring-payment',
          title: `Next recurring payment in ${nextRecurringDays} day${nextRecurringDays === 1 ? '' : 's'}`,
          detail: `${nextSubscription.name} · ${formatCurrency(nextSubscription.amount)}`,
        }
      : {
          id: 'no-recurring-payments',
          title: 'No recurring payment queued',
          detail: 'Subscriptions and scheduled debits are currently clear',
        },
  ]

  return (
    <>
      <div className="relative -mx-4 min-h-full overflow-x-hidden px-4 pb-8 pt-20 text-white">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(11,130,137,0.2),transparent_60%)]" />
        <div className="pointer-events-none fixed inset-x-0 top-0 z-30 h-24 bg-gradient-to-b from-[#090b0d] via-[#090b0d]/78 to-transparent" />
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-28 bg-gradient-to-t from-[#090b0d] via-[#090b0d]/82 to-transparent" />
        <motion.div
          className="pointer-events-none fixed left-1/2 top-3 z-20 h-24 w-[300px] -translate-x-1/2 rounded-full bg-[#0b8289]/22 blur-3xl"
          animate={
            prefersReducedMotion
              ? { opacity: isTopClusterCondensed ? 0.18 : 0.4 }
              : {
                  x: [-16, 16, -16],
                  y: [0, 4, 0],
                  opacity: isTopClusterCondensed ? [0.1, 0.16, 0.1] : [0.28, 0.42, 0.28],
                }
          }
          transition={{ duration: 12, ease: 'easeInOut', repeat: Infinity }}
        />
        <motion.div
          className="pointer-events-none fixed right-[-34px] top-20 z-10 h-28 w-28 rounded-full bg-[#6d90ff]/14 blur-3xl"
          animate={
            prefersReducedMotion
              ? { opacity: isTopClusterCondensed ? 0.11 : 0.22 }
              : {
                  x: [0, -10, 0],
                  y: [0, 10, 0],
                  opacity: isTopClusterCondensed ? [0.08, 0.13, 0.08] : [0.16, 0.26, 0.16],
                }
          }
          transition={{ duration: 15, ease: 'easeInOut', repeat: Infinity }}
        />

        <motion.div
          className="fixed inset-x-0 top-[max(env(safe-area-inset-top),0px)] z-50 flex justify-center px-4 pt-5 pointer-events-none"
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: isTopClusterCondensed ? 0.86 : 1 }}
          transition={{ duration: 0.26, ease: 'easeOut' }}
        >
          <div
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-center justify-between',
              isTopClusterCondensed
                ? 'rounded-full border border-white/[0.03] bg-[#0d1114]/38 px-1.5 py-1 shadow-[0_8px_20px_rgba(0,0,0,0.2)] backdrop-blur-[6px]'
                : 'px-0.5',
            )}
          >
            <FloatingIconButton
              onClick={() => setIsProfileOpen(true)}
              className={cn(
                'h-11 w-11',
                isTopClusterCondensed
                  ? 'shadow-[0_8px_18px_rgba(0,0,0,0.22)]'
                  : 'shadow-[0_14px_32px_rgba(0,0,0,0.34)]',
              )}
              ariaLabel="Open profile"
            >
              <span className="text-sm font-semibold text-white">{profileInitial}</span>
            </FloatingIconButton>

            <div className="flex items-center justify-end gap-1.5">
              <FloatingIconButton
                className={cn(
                  'h-11 w-11',
                  isTopClusterCondensed && 'shadow-[0_8px_18px_rgba(0,0,0,0.2)]',
                )}
                nudge={hasNewActivity}
                ariaLabel="Notifications"
              >
                <Bell size={17} strokeWidth={2.1} />
              </FloatingIconButton>
              <FloatingIconButton
                onClick={() => setIsAddMenuOpen(true)}
                className={cn(
                  'h-11 w-11 border-[#0b8289]/24 bg-[#0B8289]',
                  isTopClusterCondensed
                    ? 'shadow-[0_10px_20px_rgba(11,130,137,0.22)]'
                    : 'shadow-[0_18px_34px_rgba(11,130,137,0.36)]',
                )}
                glowPulse
                ariaLabel="Add item"
              >
                <Plus size={17} strokeWidth={2.1} />
              </FloatingIconButton>
            </div>
          </div>
        </motion.div>

        <div className="relative space-y-3">
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden rounded-[30px] border border-white/[0.06] bg-[#101316] px-5 pb-5 pt-4 shadow-[0_24px_70px_rgba(0,0,0,0.42)]"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#73dbe1]">
                <Shield size={12} strokeWidth={2.2} />
                Safe to Spend
              </div>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="inline-flex items-center gap-1 rounded-full border border-[#0B8289]/14 bg-[#0B8289]/6 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-[#87d8df]/90"
              >
                <span className={cn('h-1 w-1 rounded-full', hasNewActivity ? 'bg-[#8adfe5]/90' : 'bg-[#8dcfa8]/85')} />
                {topPillText}
              </motion.span>
            </div>

            <div className="mb-5">
              <AnimatedHeroAmount
                value={safeData.safe}
                formatValue={(value) => formatCurrency(value)}
              />
            </div>

            <div className="space-y-3 rounded-[22px] border border-white/[0.05] bg-white/[0.03] p-4">
              <div className="flex items-center justify-between text-[13px] text-white/68">
                <span>Liquid cash</span>
                <span className="font-medium text-white">{formatCurrency(safeData.liquid)}</span>
              </div>
              <div className="flex items-center justify-between text-[13px] text-white/68">
                <span>Bills protected</span>
                <span className="font-medium text-white">{formatCurrency(safeData.protectedBills)}</span>
              </div>
              <div className="flex items-center justify-between text-[13px] text-white/68">
                <span>Obligations protected</span>
                <span className="font-medium text-white">{formatCurrency(safeData.protectedObs)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 text-[13px] text-white/68">
                <span>Safety buffer</span>
                <span className="font-medium text-white">{formatCurrency(safeData.buffer)}</span>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 border-t border-white/[0.06] pt-4 text-[13px] font-medium text-[#9fd9dc]">
              <Sparkles size={14} strokeWidth={2.1} />
              <span>{systemStatus}</span>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.04 }}
            className="rounded-[28px] border border-white/[0.06] bg-[#121518] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.34)]"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-white">Action Feed</h2>
              <span className="rounded-full border border-[#0B8289]/25 bg-[#0B8289]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#80d8de]">
                Live
              </span>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {systemFeed.map((row, index) => (
                <ActionFeedRow
                  key={row.id}
                  title={row.title}
                  detail={row.detail}
                  tone={row.tone}
                  actionLabel={row.actionLabel}
                  onAction={row.onAction}
                  index={index}
                />
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.08 }}
            className="rounded-[28px] border border-white/[0.06] bg-[#121518] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.3)]"
          >
            <h2 className="mb-3 text-[17px] font-semibold text-white">Coming Up</h2>
            <div className="space-y-3">
              {comingUp.map(item => (
                <div key={item.id} className="rounded-[18px] border border-white/[0.04] bg-white/[0.02] px-3.5 py-3">
                  <p className="text-[14px] font-medium text-white">{item.title}</p>
                  <p className="mt-1 text-[12px] text-white/48">{item.detail}</p>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.12 }}
            className="rounded-[28px] border border-white/[0.04] bg-[#121518]/92 p-4 shadow-[0_14px_34px_rgba(0,0,0,0.26)]"
          >
            <div className="mb-2.5 flex items-baseline justify-between">
              <h2 className="text-[17px] font-semibold text-white">Accounts</h2>
              <button
                onClick={() => navigate('/accounts')}
                className="inline-flex items-center rounded-full border border-white/[0.035] bg-white/[0.015] px-2.5 py-0.5 text-[10px] font-medium tracking-[0.03em] text-white/52 transition-colors hover:text-white/66"
              >
                View all
              </button>
            </div>

            <div className="divide-y divide-white/[0.045]">
              {visibleAccounts.length > 0 ? (
                visibleAccounts.map(account => (
                  <button
                    key={account.id}
                    onClick={() => navigate(`/accounts/${account.id}`)}
                    className="flex w-full items-center justify-between py-2.5 text-left first:pt-1 last:pb-0.5"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate text-[13px] font-semibold text-white/94">{account.name}</p>
                      <p className="text-[9px] font-normal tracking-[0.02em] text-white/18">{account.is_linked ? 'Connected account' : 'Manual account'}</p>
                    </div>
                    <span className="text-[14px] font-semibold text-white/92">{formatCurrency(account.balance, account.currency)}</span>
                  </button>
                ))
              ) : (
                <div className="py-3 text-[13px] text-white/48">No accounts added yet.</div>
              )}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.16 }}
            className="rounded-[28px] border border-white/[0.06] bg-[#121518] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.3)]"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-white">Recent Activity</h2>
              <span className="text-[11px] uppercase tracking-[0.14em] text-white/35">Live ledger</span>
            </div>

            <div className="divide-y divide-white/[0.055]">
              {visibleTransactions.length > 0 ? (
                visibleTransactions.map(transaction => {
                  const amount = Number(transaction.amount)
                  const isIncome = amount > 0
                  const typeCueClass = isIncome ? 'bg-[#73dbe1]/80' : 'bg-white/30'
                  const transactionTitle = (transaction.merchant_clean || transaction.merchant_raw || '').trim()

                  return (
                    <div key={transaction.id} className="flex items-center justify-between gap-3 py-3.5 first:pt-1 last:pb-1">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${typeCueClass}`} />
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold text-white/96">
                            {transactionTitle}
                          </p>
                          <p className="mt-0.5 text-[11px] text-white/38">{formatActivityTime(transaction.date)}</p>
                        </div>
                      </div>
                      <span className="text-right text-[14px] font-semibold tabular-nums text-white/94">
                        {amount > 0 ? '+' : ''}{formatCurrency(amount, transaction.currency)}
                      </span>
                    </div>
                  )
                })
              ) : linkedAccount ? (
                <div className="flex items-center justify-between gap-3 py-3.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#73dbe1]/72" />
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-white/95">{linkedAccount.name} linked</p>
                      <p className="mt-0.5 text-[11px] text-white/38">Connection event</p>
                    </div>
                  </div>
                  <Link2 size={16} className="text-[#8fdfe5]" />
                </div>
              ) : (
                <div className="py-3 text-[13px] text-white/48">No recent activity yet.</div>
              )}
            </div>
          </motion.section>

          <div className="fixed bottom-28 left-0 right-0 z-50 flex flex-col items-center space-y-2 px-4 pointer-events-none">
            <AnimatePresence>
              {toasts.map((toastMessage, index) => (
                <motion.div
                  key={`${toastMessage}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  className="pointer-events-auto min-w-[220px] rounded-full border border-white/[0.08] bg-[#111418] px-5 py-3 text-[13px] font-medium text-white shadow-[0_18px_45px_rgba(0,0,0,0.42)]"
                >
                  {toastMessage}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <AddMenuDrawer 
        isOpen={isAddMenuOpen} 
        onClose={() => setIsAddMenuOpen(false)} 
        onSelectAction={(actionId) => setActiveActionForm(actionId)}
      />
      <AddAccountForm isOpen={activeActionForm === 'account'} onClose={() => setActiveActionForm(null)} />
      <AddBillForm isOpen={activeActionForm === 'bill'} onClose={() => setActiveActionForm(null)} />
      <AddDebtForm isOpen={activeActionForm === 'debt'} onClose={() => setActiveActionForm(null)} />
      <AddGoalForm isOpen={activeActionForm === 'goal'} onClose={() => setActiveActionForm(null)} />
    </>
  )
}
