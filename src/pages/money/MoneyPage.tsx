import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDownToLine, CalendarCheck2, CheckCircle2, Plus, Repeat, Wallet } from 'lucide-react'
import { useBills } from '@/hooks/useBills'
import { useSubscriptions } from '@/hooks/useSubscriptions'
import { useIncome } from '@/hooks/useIncome'
import {
  advanceDueDate,
  dueDateLabel,
  formatCurrency,
  totalActiveSubscriptions,
  totalBillsThisMonth,
  totalCancelledSavings,
} from '@/lib/utils'
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

type MoneyTab = 'bills' | 'subs' | 'income'

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

  const { bills, isLoading: billsLoading, markPaid } = useBills()
  const { subscriptions, isLoading: subsLoading, cancelSubscription } = useSubscriptions()
  const { incomeEntries, isLoading: incomeLoading, logIncome } = useIncome()

  const billsTotal = totalBillsThisMonth(bills)
  const activeSubsTotal = totalActiveSubscriptions(subscriptions)
  const savedFromCancelled = totalCancelledSavings(subscriptions)
  const weeklyIncomeRef = Number(incomeEntries[0]?.amount ?? 400)

  const summaryConfig = useMemo(() => {
    if (activeTab === 'subs') {
      return {
        eyebrow: 'Subscription Pulse',
        value: formatCurrency(activeSubsTotal),
        status: `${subscriptions.filter(sub => sub.status === 'active').length} active`,
        footer: savedFromCancelled > 0
          ? `${formatCurrency(savedFromCancelled)} reclaimed from cancelled services`
          : 'Recurring services are in steady state',
        metrics: [
          { label: 'Active services', value: subscriptions.filter(sub => sub.status === 'active').length },
          { label: 'Cancelled services', value: subscriptions.filter(sub => sub.status === 'cancelled').length },
          { label: 'Monthly recurring', value: formatCurrency(activeSubsTotal) },
        ],
      }
    }

    if (activeTab === 'income') {
      return {
        eyebrow: 'Income Ledger',
        value: formatCurrency(weeklyIncomeRef),
        status: `${incomeEntries.length} logs`,
        footer: 'Income logs feed your weekly planning rhythm',
        metrics: [
          { label: 'Recent income logs', value: incomeEntries.length },
          { label: 'Baseline weekly inflow', value: formatCurrency(weeklyIncomeRef) },
          { label: 'Last log date', value: incomeEntries[0] ? format(new Date(incomeEntries[0].date), 'dd MMM yyyy') : 'No logs yet' },
        ],
      }
    }

    const dueSoonCount = bills.filter(bill => !bill.is_paid_this_cycle).length

    return {
      eyebrow: 'Bills Command',
      value: formatCurrency(billsTotal),
      status: `${dueSoonCount} open`,
      footer: 'Upcoming obligations are tracked and payment-ready',
      metrics: [
        { label: 'Bills this cycle', value: bills.length },
        { label: 'Open bills', value: dueSoonCount },
        { label: 'Monthly load', value: formatCurrency(billsTotal) },
      ],
    }
  }, [activeSubsTotal, activeTab, bills, billsTotal, incomeEntries, savedFromCancelled, subscriptions, weeklyIncomeRef])

  const weeklyTotals = useMemo(() => {
    const recent = incomeEntries.slice(0, 4).reverse().map(entry => Number(entry.amount))
    while (recent.length < 4) recent.unshift(0)
    return recent
  }, [incomeEntries])
  const chartMax = Math.max(...weeklyTotals, 1)

  return (
    <PageShell topSlot={<FloatingTopControls hasLivePulse={activeTab === 'bills' && bills.some(bill => !bill.is_paid_this_cycle)} />}>
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
          subtitle="Bills, subscriptions, and income in one command layer"
          right={<MetadataChip label="Live" tone="teal" />}
        />

        <div className="relative overflow-hidden rounded-[16px] border border-white/[0.08] bg-white/[0.03] p-1">
          <div className="flex">
            <TabButton label="Bills" isActive={activeTab === 'bills'} onClick={() => setActiveTab('bills')} />
            <TabButton label="Subscriptions" isActive={activeTab === 'subs'} onClick={() => setActiveTab('subs')} />
            <TabButton label="Income" isActive={activeTab === 'income'} onClick={() => setActiveTab('income')} />
          </div>

          <motion.div
            className="absolute bottom-1 top-1 w-[calc(33.33%-2.66px)] rounded-[12px] bg-[#73dbe1]"
            animate={{ x: activeTab === 'bills' ? '0%' : activeTab === 'subs' ? '100%' : '200%' }}
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
        </motion.div>
      </AnimatePresence>

      <SectionCard>
        <SectionHeader title="Weekly Cadence" subtitle="Suggested rhythm for this surface" />
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-2 py-2 text-center">
            <Repeat size={15} className="mx-auto mb-1 text-white/60" />
            <p className="text-[11px] font-semibold text-white/82">Review</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-2 py-2 text-center">
            <CheckCircle2 size={15} className="mx-auto mb-1 text-[#9ddfbe]" />
            <p className="text-[11px] font-semibold text-white/82">Confirm</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-2 py-2 text-center">
            <Wallet size={15} className="mx-auto mb-1 text-[#95e4e8]" />
            <p className="text-[11px] font-semibold text-white/82">Adjust</p>
          </div>
        </div>
      </SectionCard>

      <div className="h-6" />

      <AddBillForm isOpen={isAddBillOpen} onClose={() => setIsAddBillOpen(false)} />
    </PageShell>
  )
}
