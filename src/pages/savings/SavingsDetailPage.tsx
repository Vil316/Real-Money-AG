import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, ArrowRightLeft, PiggyBank, Plus } from 'lucide-react'
import { useSavings } from '@/hooks/useSavings'
import { useAccounts } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useTransactions'
import { formatCurrency } from '@/lib/utils'
import {
  EmptyStateCard,
  FloatingTopControls,
  MetadataChip,
  PageShell,
  PremiumListRow,
  SectionCard,
  SectionHeader,
  SummaryCard,
} from '@/components/design'
import { AddContributionForm } from '@/components/modals/forms/AddContributionForm'

export function SavingsDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { goals, isLoading } = useSavings()
  const { accounts } = useAccounts()
  const { transactions } = useTransactions()

  const [isContributionOpen, setIsContributionOpen] = useState(false)

  const goal = goals.find(item => item.id === id)

  const linkedAccount = useMemo(
    () => accounts.find(account => account.id === goal?.linked_account_id),
    [accounts, goal?.linked_account_id],
  )

  const transferRows = useMemo(
    () => transactions
      .filter(transaction => {
        const merchant = transaction.merchant_raw.toLowerCase()
        const notes = (transaction.notes || '').toLowerCase()
        const goalName = (goal?.name || '').toLowerCase()

        return (
          merchant.includes('transfer to') &&
          (goalName.length === 0 || merchant.includes(goalName) || notes.includes(goalName))
        )
      })
      .slice(0, 8),
    [goal?.name, transactions],
  )

  if (isLoading) {
    return (
      <PageShell topSlot={<FloatingTopControls />}>
        <SectionCard>
          <p className="py-8 text-center text-sm font-medium text-white/60">Loading goal details...</p>
        </SectionCard>
      </PageShell>
    )
  }

  if (!goal) {
    return (
      <PageShell topSlot={<FloatingTopControls />}>
        <EmptyStateCard
          title="Goal not found"
          description="This savings goal may have been removed or is no longer available."
          actionLabel="Back to savings"
          onAction={() => navigate('/savings')}
        />
      </PageShell>
    )
  }

  const current = Number(goal.current_amount)
  const target = Number(goal.target_amount)
  const remaining = Math.max(target - current, 0)
  const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const weeklyContribution = Number(goal.weekly_contribution || 0)
  const weeksRemaining = weeklyContribution > 0 ? Math.ceil(remaining / weeklyContribution) : null

  return (
    <PageShell topSlot={<FloatingTopControls hasLivePulse={remaining > 0} />}>
      <SummaryCard
        eyebrow="Savings Goal"
        eyebrowIcon={<PiggyBank size={12} strokeWidth={2.2} />}
        status={goal.is_completed || percent >= 100 ? 'Reached' : `${percent}% complete`}
        value={formatCurrency(current)}
        metrics={[
          { label: 'Target', value: formatCurrency(target) },
          { label: 'Remaining', value: formatCurrency(remaining) },
          { label: 'Weekly contribution', value: weeklyContribution > 0 ? formatCurrency(weeklyContribution) : 'Not set' },
        ]}
        footer={goal.is_completed ? `${goal.name} has reached its target` : `${goal.name} is progressing toward completion`}
      />

      <SectionCard>
        <SectionHeader
          title={goal.name}
          subtitle={goal.is_challenge ? 'Challenge goal' : 'Standard goal'}
          right={<MetadataChip label={goal.is_completed || percent >= 100 ? 'Complete' : 'In Progress'} tone={goal.is_completed ? 'success' : 'teal'} />}
        />

        <div className="mb-3 h-3 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${percent}%`,
              backgroundColor: goal.colour || '#0B8289',
            }}
          />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/52">Linked account</p>
            <p className="mt-1 text-[14px] font-semibold text-white">{linkedAccount?.name || 'Not linked'}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/52">Runway</p>
            <p className="mt-1 text-[14px] font-semibold text-white">
              {weeksRemaining != null ? `${weeksRemaining} week${weeksRemaining === 1 ? '' : 's'}` : 'Unavailable'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setIsContributionOpen(true)}
            className="rounded-2xl border border-[#0B8289]/24 bg-[#0B8289]/12 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ddbe0] transition-colors hover:bg-[#0B8289]/18"
          >
            <span className="inline-flex items-center gap-1">
              <Plus size={14} />
              Contribute
            </span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/transfer')}
            className="rounded-2xl border border-white/[0.09] bg-white/[0.03] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/76 transition-colors hover:bg-white/[0.06]"
          >
            <span className="inline-flex items-center gap-1">
              <ArrowRightLeft size={14} />
              Transfer flow
            </span>
          </button>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader title="Recent Contributions" subtitle="Ledger events related to this goal" />

        {transferRows.length === 0 ? (
          <EmptyStateCard
            title="No contribution activity"
            description="Contributions logged for this goal will appear here as transfer entries."
          />
        ) : (
          <div className="divide-y divide-white/[0.055]">
            {transferRows.map(transaction => (
              <PremiumListRow
                key={transaction.id}
                title={transaction.merchant_raw}
                subtitle={format(new Date(transaction.date), 'dd MMM yyyy')}
                amount={formatCurrency(transaction.amount, transaction.currency)}
                tone={Number(transaction.amount) > 0 ? 'income' : 'expense'}
              />
            ))}
          </div>
        )}
      </SectionCard>

      <button
        type="button"
        onClick={() => navigate('/savings')}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.09] bg-white/[0.03] px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/76 transition-colors hover:bg-white/[0.06]"
      >
        <ArrowLeft size={16} />
        Back to savings
      </button>

      <div className="h-6" />

      <AddContributionForm
        isOpen={isContributionOpen}
        onClose={() => setIsContributionOpen(false)}
        goalId={goal.id}
        suggestedAmount={goal.weekly_contribution || 0}
      />
    </PageShell>
  )
}
