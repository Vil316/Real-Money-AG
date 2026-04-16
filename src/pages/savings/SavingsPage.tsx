import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Target } from 'lucide-react'
import { useSavings } from '@/hooks/useSavings'
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
import { AddContributionForm } from '@/components/modals/forms/AddContributionForm'
import { AddGoalForm } from '@/components/modals/forms/AddGoalForm'

export function SavingsPage() {
  const navigate = useNavigate()
  const { goals, isLoading } = useSavings()
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null)
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false)

  const totalSaved = goals.reduce((sum, goal) => sum + Number(goal.current_amount), 0)
  const totalTarget = goals.reduce((sum, goal) => sum + Number(goal.target_amount), 0)
  const completedCount = goals.filter(goal => goal.is_completed || Number(goal.current_amount) >= Number(goal.target_amount)).length
  const progressAll = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0

  const sortedGoals = useMemo(
    () => [...goals].sort((a, b) => Number(b.current_amount) - Number(a.current_amount)),
    [goals],
  )

  if (isLoading) {
    return (
      <PageShell topSlot={<FloatingTopControls />}>
        <SectionCard>
          <p className="py-8 text-center text-sm font-medium text-white/60">Syncing savings pots...</p>
        </SectionCard>
      </PageShell>
    )
  }

  return (
    <PageShell topSlot={<FloatingTopControls hasLivePulse={goals.some(goal => !goal.is_completed)} />}>
      <SummaryCard
        eyebrow="Savings Command"
        eyebrowIcon={<Target size={12} strokeWidth={2.2} />}
        status={`${progressAll}% complete`}
        value={formatCurrency(totalSaved)}
        metrics={[
          { label: 'Total target', value: formatCurrency(totalTarget) },
          { label: 'Active goals', value: goals.length },
          { label: 'Completed goals', value: completedCount },
        ]}
        footer="Goal contributions are captured inside your savings runway"
      />

      <SectionCard>
        <SectionHeader
          title="Savings Goals"
          subtitle={`${goals.length} goals in your portfolio`}
          right={<MetadataChip label="Tracked" tone="teal" />}
        />

        {sortedGoals.length === 0 ? (
          <EmptyStateCard
            title="No savings goals yet"
            description="Create a goal and start transferring contributions each week."
            actionLabel="Create goal"
            onAction={() => setIsAddGoalOpen(true)}
          />
        ) : (
          <div className="space-y-3">
            {sortedGoals.map((goal, index) => {
              const current = Number(goal.current_amount)
              const target = Number(goal.target_amount)
              const weekly = Number(goal.weekly_contribution || 0)
              const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
              const isComplete = goal.is_completed || percent >= 100

              return (
                <motion.div
                  key={goal.id}
                  variants={fadeUp(index * 0.03, 6)}
                  initial="initial"
                  animate="animate"
                  className="rounded-[24px] border border-white/[0.07] bg-white/[0.03] px-4 pb-4 pt-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-[16px] font-semibold text-white">{goal.name}</h3>
                      <p className="mt-1 text-[12px] text-white/48">
                        {formatCurrency(current)} of {formatCurrency(target)}
                      </p>
                    </div>
                    <MetadataChip
                      label={isComplete ? 'Reached' : `${percent}%`}
                      tone={isComplete ? 'success' : goal.is_challenge ? 'attention' : 'neutral'}
                    />
                  </div>

                  <div className="mb-2 h-2.5 overflow-hidden rounded-full bg-white/[0.08]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ type: 'spring', damping: 24 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: goal.colour || '#0B8289' }}
                    />
                  </div>

                  <div className="mb-3 flex items-center justify-between text-[11px] text-white/52">
                    <span>{weekly > 0 ? `${formatCurrency(weekly)} weekly plan` : 'No weekly plan set'}</span>
                    <span>{goal.is_challenge ? 'Challenge goal' : 'Standard goal'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/savings/${goal.id}`)}
                      className="rounded-2xl border border-white/[0.09] bg-white/[0.03] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/76 transition-colors hover:bg-white/[0.06]"
                    >
                      View details
                    </button>
                    <button
                      type="button"
                      disabled={isComplete}
                      onClick={() => setActiveGoalId(goal.id)}
                      className="rounded-2xl border border-[#0B8289]/24 bg-[#0B8289]/12 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ddbe0] transition-colors hover:bg-[#0B8289]/18 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Contribute
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsAddGoalOpen(true)}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.18] bg-white/[0.02] px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/68 transition-colors hover:bg-white/[0.05]"
        >
          <Plus size={16} />
          Add Savings Goal
        </button>
      </SectionCard>

      <div className="h-6" />

      <AddContributionForm
        isOpen={!!activeGoalId}
        onClose={() => setActiveGoalId(null)}
        goalId={activeGoalId || ''}
        suggestedAmount={goals.find(goal => goal.id === activeGoalId)?.weekly_contribution || 0}
      />
      <AddGoalForm isOpen={isAddGoalOpen} onClose={() => setIsAddGoalOpen(false)} />
    </PageShell>
  )
}
