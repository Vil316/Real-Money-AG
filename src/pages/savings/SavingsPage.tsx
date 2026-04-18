import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Target } from 'lucide-react'
import { useAccounts } from '@/hooks/useAccounts'
import { useBills } from '@/hooks/useBills'
import { useDebts } from '@/hooks/useDebts'
import { useObligations } from '@/hooks/useObligations'
import { useProfile } from '@/hooks/useProfile'
import { useSavings } from '@/hooks/useSavings'
import { evaluateWeeklyPressure } from '@/lib/weeklyPressure'
import { calculateSafeToSpend, formatCurrency } from '@/lib/utils'
import type { SavingsGoal } from '@/types'
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

function toSafeNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

type GoalInsight = {
  goal: SavingsGoal
  current: number
  target: number
  weekly: number
  remaining: number
  percent: number
  isComplete: boolean
  hasWeeklyPlan: boolean
  weeksToCompletion: number | null
  isNearCompletion: boolean
}

export function SavingsPage() {
  const navigate = useNavigate()
  const { accounts } = useAccounts()
  const { bills } = useBills()
  const { debts } = useDebts()
  const { obligations } = useObligations()
  const { profile } = useProfile()
  const { goals, isLoading } = useSavings()
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null)
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false)

  const currency = typeof profile?.currency === 'string' && profile.currency.trim().length > 0
    ? profile.currency
    : 'GBP'

  const safeData = calculateSafeToSpend({ accounts, bills, obligations, debts, profile })
  const pressureData = evaluateWeeklyPressure({
    bills,
    obligations,
    debts,
    safeToSpend: safeData.safeToSpend,
  })

  const goalInsights = useMemo<GoalInsight[]>(() => {
    return goals.map((goal) => {
      const current = toSafeNumber(goal.current_amount)
      const target = Math.max(toSafeNumber(goal.target_amount), 0)
      const weekly = Math.max(toSafeNumber(goal.weekly_contribution), 0)
      const remaining = Math.max(target - current, 0)
      const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
      const isComplete = goal.is_completed || percent >= 100 || remaining <= 0
      const hasWeeklyPlan = weekly > 0
      const weeksToCompletion = hasWeeklyPlan && remaining > 0
        ? Math.ceil(remaining / weekly)
        : null
      const nearCompletionThreshold = Math.max(hasWeeklyPlan ? weekly * 4 : 0, 150)
      const isNearCompletion = !isComplete && (percent >= 80 || remaining <= nearCompletionThreshold)

      return {
        goal,
        current,
        target,
        weekly,
        remaining,
        percent,
        isComplete,
        hasWeeklyPlan,
        weeksToCompletion,
        isNearCompletion,
      }
    })
  }, [goals])

  const activeGoalInsights = useMemo(
    () => goalInsights.filter((item) => !item.isComplete),
    [goalInsights],
  )

  const suggestedGoalInsight = useMemo(() => {
    if (activeGoalInsights.length === 0) return null

    const goalsWithPlan = activeGoalInsights
      .filter(item => item.hasWeeklyPlan && item.weeksToCompletion !== null)
      .sort((a, b) => {
        if ((a.weeksToCompletion ?? Number.POSITIVE_INFINITY) !== (b.weeksToCompletion ?? Number.POSITIVE_INFINITY)) {
          return (a.weeksToCompletion ?? Number.POSITIVE_INFINITY) - (b.weeksToCompletion ?? Number.POSITIVE_INFINITY)
        }
        if (a.remaining !== b.remaining) return a.remaining - b.remaining
        return b.percent - a.percent
      })

    if (goalsWithPlan.length > 0) return goalsWithPlan[0]

    return [...activeGoalInsights].sort((a, b) => {
      if (a.remaining !== b.remaining) return a.remaining - b.remaining
      return b.percent - a.percent
    })[0]
  }, [activeGoalInsights])

  const sortedGoals = useMemo(() => {
    const suggestedId = suggestedGoalInsight?.goal.id

    return [...goalInsights]
      .sort((a, b) => {
        if (suggestedId) {
          if (a.goal.id === suggestedId) return -1
          if (b.goal.id === suggestedId) return 1
        }

        if (a.isComplete !== b.isComplete) return a.isComplete ? 1 : -1
        if (a.hasWeeklyPlan !== b.hasWeeklyPlan) return a.hasWeeklyPlan ? 1 : -1
        if (a.remaining !== b.remaining) return a.remaining - b.remaining
        return b.current - a.current
      })
      .map(item => item.goal)
  }, [goalInsights, suggestedGoalInsight?.goal.id])

  const insightsById = useMemo(() => {
    const map = new Map<string, GoalInsight>()
    goalInsights.forEach((item) => {
      map.set(item.goal.id, item)
    })
    return map
  }, [goalInsights])

  const totalSaved = goalInsights.reduce((sum, goal) => sum + goal.current, 0)
  const missingWeeklyPlanCount = activeGoalInsights.filter(goal => !goal.hasWeeklyPlan).length
  const nearCompletionCount = activeGoalInsights.filter(goal => goal.isNearCompletion).length

  const contributionMode =
    safeData.status === 'attention' || pressureData.attentionLevel === 'attention'
      ? 'protection-first'
      : safeData.status === 'tight' || pressureData.attentionLevel === 'watch'
        ? 'cautious'
        : 'contribution-friendly'

  const weeklyStatusLine = contributionMode === 'protection-first'
    ? 'Protection-first week'
    : contributionMode === 'cautious'
      ? 'Cautious contribution week'
      : 'Contribution-friendly week'

  const suggestionLine = suggestedGoalInsight
    ? `Suggested next: ${suggestedGoalInsight.goal.name} (${formatCurrency(suggestedGoalInsight.remaining, currency)} remaining${suggestedGoalInsight.weeksToCompletion !== null ? `, ~${suggestedGoalInsight.weeksToCompletion} week${suggestedGoalInsight.weeksToCompletion === 1 ? '' : 's'} at current plan` : ''}).`
    : 'No active goal needs support this week.'

  const cautionLine = contributionMode === 'protection-first'
    ? `Near-term pressure is elevated (${pressureData.dueSoonCount} due soon). Keep savings contributions optional this week.`
    : contributionMode === 'cautious'
      ? `Essentials are in view (${pressureData.dueSoonCount} due soon, ${pressureData.upcomingCount} upcoming). Prioritize one realistic goal.`
      : 'Core obligations look covered. This week supports planned savings contributions.'

  const planningDetailLine = missingWeeklyPlanCount > 0
    ? `${missingWeeklyPlanCount} active goal${missingWeeklyPlanCount === 1 ? '' : 's'} missing weekly planning detail.`
    : 'All active goals have a weekly contribution plan.'

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
        eyebrow="Savings Intelligence"
        eyebrowIcon={<Target size={12} strokeWidth={2.2} />}
        status={weeklyStatusLine}
        value={formatCurrency(totalSaved, currency)}
        tone={contributionMode === 'protection-first' ? 'attention' : contributionMode === 'cautious' ? 'teal' : 'success'}
        metrics={[
          { label: 'Safe to spend now', value: formatCurrency(safeData.safeToSpend, currency) },
          { label: 'Needs weekly plan', value: missingWeeklyPlanCount },
          { label: 'Near completion', value: nearCompletionCount },
        ]}
        footer={`${cautionLine} ${suggestionLine} ${planningDetailLine}`}
      />

      <SectionCard>
        <SectionHeader
          title="Savings Goals"
          subtitle={`${goals.length} goals in your portfolio${missingWeeklyPlanCount > 0 ? ` · ${missingWeeklyPlanCount} need weekly plan detail` : ''}`}
          right={<MetadataChip label={contributionMode === 'protection-first' ? 'Protect first' : contributionMode === 'cautious' ? 'Cautious' : 'Contribute'} tone={contributionMode === 'protection-first' ? 'attention' : contributionMode === 'cautious' ? 'teal' : 'success'} />}
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
              const insight = insightsById.get(goal.id)
              const current = insight?.current ?? 0
              const target = insight?.target ?? 0
              const weekly = insight?.weekly ?? 0
              const percent = insight?.percent ?? 0
              const isComplete = insight?.isComplete ?? false
              const hasWeeklyPlan = insight?.hasWeeklyPlan ?? false
              const isSuggested = suggestedGoalInsight?.goal.id === goal.id
              const secondaryLine = isSuggested
                ? 'Most realistic goal to support next'
                : !hasWeeklyPlan && !isComplete
                  ? 'Needs weekly contribution detail'
                  : insight?.weeksToCompletion !== null
                    ? `~${insight.weeksToCompletion} week${insight.weeksToCompletion === 1 ? '' : 's'} at current plan`
                    : 'Progressing by manual contributions'

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
                      label={isComplete ? 'Reached' : isSuggested ? 'Support next' : !hasWeeklyPlan ? 'Plan needed' : `${percent}%`}
                      tone={isComplete ? 'success' : isSuggested ? 'teal' : !hasWeeklyPlan ? 'attention' : goal.is_challenge ? 'attention' : 'neutral'}
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
                    <span>{weekly > 0 ? `${formatCurrency(weekly, currency)} weekly plan` : 'No weekly plan set'}</span>
                    <span>{secondaryLine}</span>
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
