import { useMemo, useState } from 'react'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDownToLine, CalendarCheck2, CheckCircle2, HandCoins, Plus, Repeat, Wallet } from 'lucide-react'
import { useAccounts } from '@/hooks/useAccounts'
import { useBills } from '@/hooks/useBills'
import { useSubscriptions } from '@/hooks/useSubscriptions'
import { useIncome } from '@/hooks/useIncome'
import { useDebts } from '@/hooks/useDebts'
import { useObligations } from '@/hooks/useObligations'
import { useProfile } from '@/hooks/useProfile'
import { evaluateWeeklyPressure } from '@/lib/weeklyPressure'
import {
  doesObligationAffectProtectedMoney,
  formatObligationAmountPresentation,
  formatObligationCadence,
  formatObligationTypeLabel,
  getObligationCadence,
} from '@/lib/obligations'
import {
  advanceDueDate,
  calculateSafeToSpend,
  dueDateLabel,
  formatCurrency,
  totalActiveSubscriptions,
  totalBillsThisMonth,
  totalCancelledSavings,
} from '@/lib/utils'
import type { Obligation } from '@/types'
import {
  EmptyStateCard,
  FloatingTopControls,
  MetadataChip,
  PageShell,
  PremiumListRow,
  SectionCard,
  SectionHeader,
  SummaryCard,
  fadeUp,
} from '@/components/design'
import { AddBillForm } from '@/components/modals/forms/AddBillForm'

type MoneyTab = 'bills' | 'subs' | 'income' | 'obligations'

type ObligationDisplay = {
  id: string
  name: string
  typeLabel: string
  cadenceLabel: string
  amountValue: number
  amountLabel: string
  modeLabel: 'Fixed' | 'Percentage'
  influencesProtectedMoney: boolean
  isFulfilled: boolean
}

function mapObligationForDisplay(
  obligation: Obligation,
  currency: string,
): ObligationDisplay {
  const amount = Number(obligation.amount ?? 0)
  const isPercentage = obligation.amount_type === 'percentage'
  const cadence = getObligationCadence(obligation)

  return {
    id: obligation.id,
    name: obligation.name?.trim() || 'Untitled obligation',
    typeLabel: formatObligationTypeLabel(obligation.type),
    cadenceLabel: formatObligationCadence(cadence),
    amountValue: Number.isFinite(amount) ? amount : 0,
    amountLabel: formatObligationAmountPresentation(obligation, currency),
    modeLabel: isPercentage ? 'Percentage' : 'Fixed',
    influencesProtectedMoney: doesObligationAffectProtectedMoney(obligation) && !obligation.is_fulfilled_this_cycle,
    isFulfilled: !!obligation.is_fulfilled_this_cycle,
  }
}

function parseIsoDateSafe(value?: string | null): Date | null {
  if (!value) return null
  const parsed = parseISO(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function TabButton({
  label,
  isActive,
  onClick,
}: {
  label: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative z-10 flex-1 rounded-[12px] py-2.5 text-[12px] font-bold tracking-wide transition-colors ${
        isActive ? 'text-[#091014]' : 'text-white/55 hover:text-white/82'
      }`}
    >
      {label}
    </button>
  )
}

export function MoneyPage() {
  const [activeTab, setActiveTab] = useState<MoneyTab>('bills')
  const [isAddBillOpen, setIsAddBillOpen] = useState(false)

  const { accounts } = useAccounts()
  const { bills, isLoading: billsLoading, markPaid } = useBills()
  const { subscriptions, isLoading: subsLoading, cancelSubscription } = useSubscriptions()
  const { incomeEntries, isLoading: incomeLoading, logIncome } = useIncome()
  const { debts } = useDebts()
  const { obligations, isLoading: obligationsLoading } = useObligations()
  const { profile } = useProfile()

  const currency = typeof profile?.currency === 'string' && profile.currency.trim().length > 0
    ? profile.currency
    : 'GBP'

  const billsTotal = totalBillsThisMonth(bills)
  const activeSubsTotal = totalActiveSubscriptions(subscriptions)
  const savedFromCancelled = totalCancelledSavings(subscriptions)
  const weeklyIncomeRef = Number(incomeEntries[0]?.amount ?? 400)
  const safeData = calculateSafeToSpend({ accounts, bills, obligations, debts, profile })
  const pressureData = evaluateWeeklyPressure({
    bills,
    obligations,
    debts,
    safeToSpend: safeData.safeToSpend,
  })

  const obligationItems = useMemo(
    () => obligations.map(obligation => mapObligationForDisplay(obligation, currency)),
    [currency, obligations],
  )
  const activeObligationCount = obligationItems.length
  const protectedMoneyObligationCount = obligationItems.filter(item => item.influencesProtectedMoney).length
  const openBillsCount = bills.filter(bill => !bill.is_paid_this_cycle).length
  const billDueSoonCount = pressureData.attentionItems.filter(
    item => item.sourceType === 'bill' && item.timingBucket === 'dueSoon',
  ).length
  const billUpcomingCount = pressureData.attentionItems.filter(
    item => item.sourceType === 'bill' && item.timingBucket === 'upcoming',
  ).length
  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active')
  const subscriptionDueSoonCount = activeSubscriptions.filter((sub) => {
    const nextDate = parseIsoDateSafe(sub.next_billing_date)
    if (!nextDate) return false
    const daysUntil = differenceInCalendarDays(nextDate, new Date())
    return daysUntil >= 0 && daysUntil <= 7
  }).length
  const subscriptionUpcomingCount = activeSubscriptions.filter((sub) => {
    const nextDate = parseIsoDateSafe(sub.next_billing_date)
    if (!nextDate) return false
    const daysUntil = differenceInCalendarDays(nextDate, new Date())
    return daysUntil >= 8 && daysUntil <= 21
  }).length
  const obligationDueSoonCount = pressureData.attentionItems.filter(
    item => item.sourceType === 'obligation' && item.timingBucket === 'dueSoon',
  ).length
  const obligationUpcomingCount = pressureData.attentionItems.filter(
    item => item.sourceType === 'obligation' && item.timingBucket === 'upcoming',
  ).length
  const obligationProtectedThisWeek = pressureData.attentionItems.reduce((sum, item) => {
    if (item.sourceType !== 'obligation' || !item.includedInProtection) return sum
    return sum + item.amount
  }, 0)
  const latestIncomeLogDate = parseIsoDateSafe(incomeEntries[0]?.date)
  const daysSinceLastIncomeLog = latestIncomeLogDate
    ? Math.max(differenceInCalendarDays(new Date(), latestIncomeLogDate), 0)
    : null
  const incomeNeedsConfirmation = incomeEntries.length === 0 || (daysSinceLastIncomeLog !== null && daysSinceLastIncomeLog > 14)
  const latestIncomeLogLabel = latestIncomeLogDate ? format(latestIncomeLogDate, 'dd MMM yyyy') : 'Not logged'
  const needsConfirmingThisWeek = pressureData.attentionItems.filter(
    item => item.sourceType === 'obligation' && (item.timingBucket === 'dueSoon' || item.timingBucket === 'undated'),
  ).length

  const summaryConfig = useMemo(() => {
    if (activeTab === 'subs') {
      return {
        eyebrow: 'Subscription Pulse',
        value: formatCurrency(activeSubsTotal),
        status: `${activeSubscriptions.length} active service${activeSubscriptions.length === 1 ? '' : 's'}`,
        footer: savedFromCancelled > 0
          ? `${formatCurrency(savedFromCancelled)} reclaimed monthly from cancelled services.`
          : subscriptionDueSoonCount > 0
            ? `${subscriptionDueSoonCount} renewal${subscriptionDueSoonCount === 1 ? '' : 's'} due in the next 7 days.`
            : 'Recurring services are stable this week.',
        metrics: [
          { label: 'Renewals in 7 days', value: subscriptionDueSoonCount },
          { label: 'Renewals 8-21d', value: subscriptionUpcomingCount },
          { label: 'Recurring load (monthly)', value: formatCurrency(activeSubsTotal) },
        ],
      }
    }

    if (activeTab === 'income') {
      return {
        eyebrow: 'Income Ledger',
        value: formatCurrency(weeklyIncomeRef),
        status: incomeNeedsConfirmation ? 'Needs confirmation' : 'Logs current',
        footer: incomeEntries.length === 0
          ? 'No income logs yet. Log income to keep weekly planning current.'
          : incomeNeedsConfirmation
            ? `Last income log: ${latestIncomeLogLabel}. Confirm this week\'s inflow.`
            : `Last income log: ${latestIncomeLogLabel}. Income tracking is current.`,
        metrics: [
          { label: 'Expected income (weekly)', value: formatCurrency(weeklyIncomeRef) },
          { label: 'Income logs', value: incomeEntries.length },
          { label: 'Last log', value: latestIncomeLogLabel },
        ],
      }
    }

    if (activeTab === 'obligations') {
      return {
        eyebrow: 'Obligations Surface',
        value: formatCurrency(obligationProtectedThisWeek, currency),
        status: needsConfirmingThisWeek > 0
          ? `${needsConfirmingThisWeek} to confirm`
          : obligationDueSoonCount > 0
            ? `${obligationDueSoonCount} due in 7 days`
            : 'Commitments steady',
        footer: `${protectedMoneyObligationCount > 0
          ? `${protectedMoneyObligationCount} fixed obligation${protectedMoneyObligationCount === 1 ? '' : 's'} currently protecting this week.`
          : 'No pending fixed obligations currently affecting protected money.'}${obligationUpcomingCount > 0 ? ` ${obligationUpcomingCount} more due in 8-21 days.` : ''}`,
        metrics: [
          { label: 'Due in 7 days', value: obligationDueSoonCount },
          { label: 'Upcoming 8-21d', value: obligationUpcomingCount },
          { label: 'Protected this week', value: formatCurrency(obligationProtectedThisWeek, currency) },
        ],
      }
    }

    return {
      eyebrow: 'Bills Command',
      value: formatCurrency(billsTotal),
      status: billDueSoonCount > 0 ? `${billDueSoonCount} due in 7 days` : 'No bills due in 7 days',
      footer: `${openBillsCount} open bill${openBillsCount === 1 ? '' : 's'} in this cycle${billUpcomingCount > 0 ? ` · ${billUpcomingCount} due in 8-21 days.` : '.'}`,
      metrics: [
        { label: 'Open bills', value: openBillsCount },
        { label: 'Upcoming 8-21d', value: billUpcomingCount },
        { label: 'Bill load (monthly)', value: formatCurrency(billsTotal) },
      ],
    }
  }, [
    activeSubsTotal,
    activeTab,
    bills,
    billDueSoonCount,
    billUpcomingCount,
    billsTotal,
    currency,
    incomeNeedsConfirmation,
    incomeEntries,
    latestIncomeLogLabel,
    needsConfirmingThisWeek,
    obligationDueSoonCount,
    obligationProtectedThisWeek,
    obligationUpcomingCount,
    openBillsCount,
    protectedMoneyObligationCount,
    savedFromCancelled,
    subscriptionDueSoonCount,
    subscriptionUpcomingCount,
    subscriptions,
    weeklyIncomeRef,
    activeSubscriptions.length,
  ])

  const weeklyTotals = useMemo(() => {
    const recent = incomeEntries.slice(0, 4).reverse().map(entry => Number(entry.amount))
    while (recent.length < 4) recent.unshift(0)
    return recent
  }, [incomeEntries])
  const chartMax = Math.max(...weeklyTotals, 1)

  const cadenceReviewDetail =
    pressureData.dueSoonCount > 0
      ? `${pressureData.dueSoonCount} due soon`
      : 'Window clear'
  const cadenceConfirmDetail =
    needsConfirmingThisWeek > 0
      ? `${needsConfirmingThisWeek} to confirm`
      : 'Nothing pending'
  const cadenceAdjustDetail =
    pressureData.protectedThisWeek > 0
      ? `${formatCurrency(pressureData.protectedThisWeek, currency)} protected`
      : 'No protected amount'
  const cadenceSubtitle =
    pressureData.attentionLevel === 'attention'
      ? 'Prioritize due-soon actions in this week window'
      : pressureData.attentionLevel === 'watch'
        ? 'Stay ahead of upcoming commitments in the next 21 days'
        : 'Your current week is stable; keep your normal cadence'

  return (
    <PageShell topSlot={<FloatingTopControls hasLivePulse={pressureData.attentionLevel !== 'calm'} />}>
      <SummaryCard
        eyebrow={summaryConfig.eyebrow}
        eyebrowIcon={<Wallet size={12} strokeWidth={2.2} />}
        status={summaryConfig.status}
        value={summaryConfig.value}
        metrics={summaryConfig.metrics}
        footer={summaryConfig.footer}
      />

      <SectionCard>
        <SectionHeader
          title="Money Surfaces"
          subtitle="Bills, subscriptions, income, and obligations in one command layer"
          right={<MetadataChip label="Live" tone="teal" />}
        />

        <div className="relative overflow-hidden rounded-[16px] border border-white/[0.08] bg-white/[0.03] p-1">
          <div className="flex">
            <TabButton label="Bills" isActive={activeTab === 'bills'} onClick={() => setActiveTab('bills')} />
            <TabButton label="Subscriptions" isActive={activeTab === 'subs'} onClick={() => setActiveTab('subs')} />
            <TabButton label="Income" isActive={activeTab === 'income'} onClick={() => setActiveTab('income')} />
            <TabButton label="Obligations" isActive={activeTab === 'obligations'} onClick={() => setActiveTab('obligations')} />
          </div>

          <motion.div
            className="absolute bottom-1 top-1 w-[calc(25%-3px)] rounded-[12px] bg-[#73dbe1]"
            animate={{ x: activeTab === 'bills' ? '0%' : activeTab === 'subs' ? '100%' : activeTab === 'income' ? '200%' : '300%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          />
        </div>
      </SectionCard>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={fadeUp(0.02, 8)}
          initial="initial"
          animate="animate"
          exit="exit"
          className="space-y-3"
        >
          {activeTab === 'bills' ? (
            <SectionCard>
              <SectionHeader
                title="Upcoming Bills"
                subtitle={billsLoading ? 'Syncing bills...' : `${bills.length} total bills`}
                right={<MetadataChip label={billsLoading ? 'Syncing' : 'Tracked'} tone={billsLoading ? 'attention' : 'teal'} />}
              />

              {billsLoading ? (
                <p className="py-8 text-center text-sm font-medium text-white/55">Loading bill schedule...</p>
              ) : bills.length === 0 ? (
                <EmptyStateCard
                  title="No recurring bills"
                  description="Create a bill to keep your monthly outflows predictable."
                  actionLabel="Add bill"
                  onAction={() => setIsAddBillOpen(true)}
                />
              ) : (
                <div className="divide-y divide-white/[0.055]">
                  {bills.map((bill) => {
                    const label = dueDateLabel(bill.next_due_date)
                    const isLate = label.includes('overdue') && !bill.is_paid_this_cycle
                    const isPaid = bill.is_paid_this_cycle

                    return (
                      <PremiumListRow
                        key={bill.id}
                        title={bill.name}
                        subtitle={`${bill.frequency} · ${label}`}
                        amount={formatCurrency(bill.amount)}
                        tone={isLate ? 'attention' : 'expense'}
                        trailing={isPaid ? (
                          <MetadataChip label="Paid" tone="success" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => markPaid.mutate({ id: bill.id, nextDueDate: advanceDueDate(bill.next_due_date, bill.frequency) })}
                            className="rounded-full border border-[#73dbe1]/26 bg-[#73dbe1]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#95e4e8]"
                          >
                            Mark
                          </button>
                        )}
                      />
                    )
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsAddBillOpen(true)}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.18] bg-white/[0.02] px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/68 transition-colors hover:bg-white/[0.05]"
              >
                <Plus size={16} />
                Add Bill
              </button>
            </SectionCard>
          ) : null}

          {activeTab === 'subs' ? (
            <SectionCard>
              <SectionHeader
                title="Subscriptions"
                subtitle={subsLoading ? 'Syncing subscriptions...' : `${subscriptions.length} services tracked`}
                right={<MetadataChip label={subsLoading ? 'Syncing' : 'Recurring'} tone={subsLoading ? 'attention' : 'teal'} />}
              />

              {subsLoading ? (
                <p className="py-8 text-center text-sm font-medium text-white/55">Loading subscription ledger...</p>
              ) : subscriptions.length === 0 ? (
                <EmptyStateCard
                  title="No subscriptions"
                  description="You can keep recurring services visible from this tab."
                />
              ) : (
                <>
                  <div className="mb-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">Monthly active</p>
                    <p className="mt-1 text-[26px] font-semibold text-white">{formatCurrency(activeSubsTotal)}</p>
                  </div>

                  <div className="divide-y divide-white/[0.055]">
                    {subscriptions
                      .filter(sub => sub.status === 'active')
                      .map(sub => (
                        <PremiumListRow
                          key={sub.id}
                          title={sub.name}
                          subtitle={`${sub.category} · ${dueDateLabel(sub.next_billing_date)}`}
                          amount={formatCurrency(sub.amount)}
                          tone="expense"
                          trailing={
                            <button
                              type="button"
                              onClick={() => cancelSubscription.mutate(sub.id)}
                              className="rounded-full border border-white/[0.14] bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/72"
                            >
                              Cancel
                            </button>
                          }
                        />
                      ))}
                  </div>

                  {subscriptions.some(sub => sub.status === 'cancelled') ? (
                    <div className="mt-4 rounded-2xl border border-[#74d4a3]/24 bg-[#74d4a3]/8 px-3 py-3">
                      <p className="text-[12px] font-medium text-[#9ddfbe]">
                        {formatCurrency(savedFromCancelled)} per month reclaimed from cancelled services.
                      </p>
                    </div>
                  ) : null}
                </>
              )}
            </SectionCard>
          ) : null}

          {activeTab === 'income' ? (
            <>
              <SectionCard>
                <SectionHeader
                  title="Income Velocity"
                  subtitle="Recent weekly bars"
                  right={<MetadataChip label={incomeLoading ? 'Syncing' : 'Ledger'} tone={incomeLoading ? 'attention' : 'teal'} />}
                />

                {incomeLoading ? (
                  <p className="py-8 text-center text-sm font-medium text-white/55">Loading income history...</p>
                ) : (
                  <div className="mt-2 flex h-32 items-end gap-3 px-2">
                    {weeklyTotals.map((value, index) => {
                      const height = (value / chartMax) * 100
                      return (
                        <div key={`${value}-${index}`} className="flex flex-1 flex-col items-center gap-2">
                          <div className="text-[10px] font-semibold text-white/45">{value > 0 ? formatCurrency(value) : '-'}</div>
                          <div className="relative flex h-20 w-full items-end overflow-hidden rounded-t-md border border-white/[0.08] bg-white/[0.03]">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${height}%` }}
                              transition={{ type: 'spring', damping: 20 }}
                              className="w-full bg-[#73dbe1]/78"
                            />
                          </div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/45">W{index + 1}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </SectionCard>

              <SectionCard>
                <SectionHeader title="Recent Income Logs" subtitle={`${incomeEntries.length} entries`} />
                {incomeEntries.length === 0 ? (
                  <EmptyStateCard
                    title="No income logged yet"
                    description="Log income to keep your weekly planning accurate."
                  />
                ) : (
                  <div className="divide-y divide-white/[0.055]">
                    {incomeEntries.map(entry => (
                      <PremiumListRow
                        key={entry.id}
                        title={entry.payment_method.replace('_', ' ')}
                        subtitle={format(new Date(entry.date), 'dd MMM yyyy')}
                        amount={`+${formatCurrency(entry.amount)}`}
                        tone="income"
                        leading={<ArrowDownToLine size={15} className="text-[#9ddfbe]" />}
                      />
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => logIncome.mutate({ amount: weeklyIncomeRef, payment_method: 'bank_transfer' })}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#74d4a3]/28 bg-[#74d4a3]/10 px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#9ddfbe] transition-colors hover:bg-[#74d4a3]/15"
                >
                  <CalendarCheck2 size={16} />
                  Log Income ({formatCurrency(weeklyIncomeRef)})
                </button>
              </SectionCard>
            </>
          ) : null}

          {activeTab === 'obligations' ? (
            <SectionCard>
              <SectionHeader
                title="Obligations"
                subtitle={obligationsLoading ? 'Syncing obligations...' : `${activeObligationCount} active obligations`}
                right={<MetadataChip label={obligationsLoading ? 'Syncing' : 'Tracked'} tone={obligationsLoading ? 'attention' : 'teal'} />}
              />

              {obligationsLoading ? (
                <p className="py-8 text-center text-sm font-medium text-white/55">Loading obligations...</p>
              ) : obligationItems.length === 0 ? (
                <EmptyStateCard
                  title="No obligations yet"
                  description="Add recurring commitments to keep protected money and planning more accurate."
                />
              ) : (
                <>
                  {protectedMoneyObligationCount > 0 ? (
                    <div className="mb-3 rounded-2xl border border-[#d6b27a]/26 bg-[#d6b27a]/8 px-3 py-3">
                      <p className="text-[12px] font-medium text-[#dfc095]">
                        {protectedMoneyObligationCount === 1
                          ? '1 fixed obligation is currently protecting money.'
                          : `${protectedMoneyObligationCount} fixed obligations are currently protecting money.`}
                      </p>
                    </div>
                  ) : null}

                  <div className="divide-y divide-white/[0.055]">
                    {obligationItems.map(item => (
                      <PremiumListRow
                        key={item.id}
                        title={item.name}
                        subtitle={`${item.typeLabel} · ${item.modeLabel}${item.modeLabel === 'Percentage' ? ` · ${item.cadenceLabel}` : ''}`}
                        amount={item.amountLabel}
                        tone={item.influencesProtectedMoney ? 'attention' : item.isFulfilled ? 'success' : 'expense'}
                        leading={<HandCoins size={15} className={item.influencesProtectedMoney ? 'text-[#dfc095]' : 'text-[#95e4e8]'} />}
                        trailing={
                          <MetadataChip
                            label={
                              item.isFulfilled
                                ? 'Done'
                                : item.influencesProtectedMoney
                                  ? 'Protecting'
                                  : 'Active'
                            }
                            tone={item.isFulfilled ? 'success' : item.influencesProtectedMoney ? 'attention' : 'neutral'}
                          />
                        }
                      />
                    ))}
                  </div>
                </>
              )}
            </SectionCard>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <SectionCard>
        <SectionHeader title="Weekly Cadence" subtitle={cadenceSubtitle} />
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-2 py-2 text-center">
            <Repeat size={15} className="mx-auto mb-1 text-white/60" />
            <p className="text-[11px] font-semibold text-white/82">Review</p>
            <p className="mt-0.5 text-[10px] text-white/52">{cadenceReviewDetail}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-2 py-2 text-center">
            <CheckCircle2 size={15} className="mx-auto mb-1 text-[#9ddfbe]" />
            <p className="text-[11px] font-semibold text-white/82">Confirm</p>
            <p className="mt-0.5 text-[10px] text-white/52">{cadenceConfirmDetail}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-2 py-2 text-center">
            <Wallet size={15} className="mx-auto mb-1 text-[#95e4e8]" />
            <p className="text-[11px] font-semibold text-white/82">Adjust</p>
            <p className="mt-0.5 text-[10px] text-white/52">{cadenceAdjustDetail}</p>
          </div>
        </div>
      </SectionCard>

      <div className="h-6" />

      <AddBillForm isOpen={isAddBillOpen} onClose={() => setIsAddBillOpen(false)} />
    </PageShell>
  )
}
