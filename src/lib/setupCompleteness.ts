import { differenceInCalendarDays, isToday, parseISO, startOfDay } from 'date-fns'
import { isPayday } from '@/lib/utils'
import type {
  Obligation,
  SetupCompletenessCategoryProgress,
  SetupCompletenessInput,
  SetupCompletenessResult,
  SetupGapCategory,
  SetupGapItem,
  SetupGapSeverity,
  SetupTrustLevel,
} from '@/types'

const CATEGORY_MAX_SCORE = 20

const CATEGORY_LABELS: Record<SetupGapCategory, string> = {
  debt: 'Debt setup',
  obligation: 'Obligation setup',
  savings: 'Savings setup',
  income: 'Income setup',
  account: 'Account trust',
}

function toFiniteNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseDateSafe(value: unknown): Date | null {
  if (!value) return null

  const parsed = value instanceof Date
    ? value
    : typeof value === 'string'
      ? parseISO(value)
      : null

  if (!parsed || !Number.isFinite(parsed.getTime())) return null
  return parsed
}

function extractObligationDueDate(obligation: Obligation | null | undefined): unknown {
  if (!obligation) return null

  const withOptionalDates = obligation as (typeof obligation) & {
    next_due_date?: unknown
    next_payment_date?: unknown
    due_date?: unknown
  }

  const candidates = [withOptionalDates.due_date, withOptionalDates.next_due_date, withOptionalDates.next_payment_date]

  for (const candidate of candidates) {
    if (parseDateSafe(candidate)) return candidate
  }

  return null
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function createGroupedMissingItems(): SetupCompletenessResult['groupedMissingItems'] {
  return {
    debt: { blocking: [], warning: [] },
    obligation: { blocking: [], warning: [] },
    savings: { blocking: [], warning: [] },
    income: { blocking: [], warning: [] },
    account: { blocking: [], warning: [] },
  }
}

function createGapItem(params: {
  id: string
  category: SetupGapCategory
  severity: SetupGapSeverity
  title: string
  detail: string
  affects: SetupGapItem['affects']
}): SetupGapItem {
  return {
    id: params.id,
    category: params.category,
    severity: params.severity,
    title: params.title,
    detail: params.detail,
    affects: params.affects,
  }
}

function resolveTrustLevel(completionScore: number, blockingCount: number): SetupTrustLevel {
  if (completionScore >= 85 && blockingCount === 0) return 'high'
  if (completionScore >= 60 && blockingCount <= 2) return 'medium'
  return 'low'
}

export function evaluateSetupCompleteness(input: SetupCompletenessInput = {}): SetupCompletenessResult {
  const accounts = Array.isArray(input.accounts) ? input.accounts : []
  const debts = Array.isArray(input.debts) ? input.debts : []
  const obligations = Array.isArray(input.obligations) ? input.obligations : []
  const savingsGoals = Array.isArray(input.savingsGoals) ? input.savingsGoals : []
  const incomeEntries = Array.isArray(input.incomeEntries) ? input.incomeEntries : []

  const asOfDate = input.asOfDate instanceof Date && Number.isFinite(input.asOfDate.getTime())
    ? startOfDay(input.asOfDate)
    : startOfDay(new Date())

  const groupedMissingItems = createGroupedMissingItems()
  const categoryScores: Record<SetupGapCategory, number> = {
    debt: CATEGORY_MAX_SCORE,
    obligation: CATEGORY_MAX_SCORE,
    savings: CATEGORY_MAX_SCORE,
    income: CATEGORY_MAX_SCORE,
    account: CATEGORY_MAX_SCORE,
  }

  const pushGap = (item: SetupGapItem) => {
    if (item.severity === 'blocking') {
      groupedMissingItems[item.category].blocking.push(item)
      return
    }

    groupedMissingItems[item.category].warning.push(item)
  }

  const activeDebts = debts.filter(debt => !debt?.is_settled)
  activeDebts.forEach((debt) => {
    const debtName = debt.name?.trim() || debt.creditor_name?.trim() || 'Debt'

    if (toFiniteNumber(debt.minimum_payment) <= 0) {
      pushGap(createGapItem({
        id: `debt:min:${debt.id}`,
        category: 'debt',
        severity: 'blocking',
        title: `Missing minimum payment for ${debtName}`,
        detail: 'Minimum payment is required for debt prioritization and protection calculations.',
        affects: ['safe-to-spend', 'prioritization'],
      }))
    }

    if (!parseDateSafe(debt.next_payment_date)) {
      pushGap(createGapItem({
        id: `debt:due:${debt.id}`,
        category: 'debt',
        severity: 'blocking',
        title: `Missing payment timing for ${debtName}`,
        detail: 'Next payment date is needed to place this debt in weekly pressure windows.',
        affects: ['safe-to-spend', 'prioritization'],
      }))
    }
  })

  const debtBlockingCount = groupedMissingItems.debt.blocking.length
  categoryScores.debt = Math.max(0, CATEGORY_MAX_SCORE - debtBlockingCount * 6)

  const activeObligations = obligations.filter(
    obligation => !obligation?.is_fulfilled_this_cycle && obligation?.is_active !== false && obligation?.enabled !== false,
  )

  activeObligations.forEach((obligation) => {
    const obligationName = obligation.name?.trim() || 'Obligation'
    const dueDate = extractObligationDueDate(obligation)

    if (!parseDateSafe(dueDate)) {
      pushGap(createGapItem({
        id: `obligation:timing:${obligation.id}`,
        category: 'obligation',
        severity: 'blocking',
        title: `Missing timing for ${obligationName}`,
        detail: 'Obligation needs explicit timing for reliable weekly prioritization.',
        affects: ['safe-to-spend', 'prioritization'],
      }))
    }

    if (!obligation.cadence || obligation.cadence === 'custom') {
      pushGap(createGapItem({
        id: `obligation:cadence:${obligation.id}`,
        category: 'obligation',
        severity: 'warning',
        title: `Cadence details incomplete for ${obligationName}`,
        detail: 'Cadence clarity improves forecasting confidence for this commitment.',
        affects: ['prioritization'],
      }))
    }
  })

  const obligationBlockingCount = groupedMissingItems.obligation.blocking.length
  const obligationWarningCount = groupedMissingItems.obligation.warning.length
  categoryScores.obligation = Math.max(0, CATEGORY_MAX_SCORE - obligationBlockingCount * 6 - obligationWarningCount * 3)

  const activeSavingsGoals = savingsGoals.filter(goal => {
    const current = toFiniteNumber(goal.current_amount)
    const target = toFiniteNumber(goal.target_amount)
    return !goal.is_completed && target > current
  })

  activeSavingsGoals.forEach((goal) => {
    if (toFiniteNumber(goal.weekly_contribution) > 0) return

    pushGap(createGapItem({
      id: `savings:weekly:${goal.id}`,
      category: 'savings',
      severity: 'warning',
      title: `Missing weekly plan for ${goal.name}`,
      detail: 'Weekly contribution planning is missing for this active goal.',
      affects: ['prioritization'],
    }))
  })

  const savingsWarningCount = groupedMissingItems.savings.warning.length
  categoryScores.savings = Math.max(0, CATEGORY_MAX_SCORE - savingsWarningCount * 4)

  const sortedIncomeEntries = [...incomeEntries]
    .filter(entry => !!entry?.date)
    .sort((left, right) => right.date.localeCompare(left.date))

  const expectedIncome = !!input.profile && toFiniteNumber(input.profile.income_amount) > 0
  if (expectedIncome) {
    if (sortedIncomeEntries.length === 0) {
      pushGap(createGapItem({
        id: 'income:no-log',
        category: 'income',
        severity: 'blocking',
        title: 'Income log missing',
        detail: 'Expected income is set but no income entries are logged yet.',
        affects: ['safe-to-spend', 'prioritization'],
      }))
    } else {
      const latestIncomeDate = parseDateSafe(sortedIncomeEntries[0]?.date)

      if (!latestIncomeDate) {
        pushGap(createGapItem({
          id: 'income:invalid-date',
          category: 'income',
          severity: 'blocking',
          title: 'Income log date invalid',
          detail: 'Latest income entry has invalid timing and cannot be used for cycle confidence.',
          affects: ['safe-to-spend', 'prioritization'],
        }))
      } else {
        const daysSince = Math.max(differenceInCalendarDays(asOfDate, startOfDay(latestIncomeDate)), 0)
        const staleThreshold = input.profile?.income_frequency === 'weekly' ? 8 : 35

        if (daysSince > staleThreshold) {
          pushGap(createGapItem({
            id: 'income:stale-blocking',
            category: 'income',
            severity: 'blocking',
            title: 'Income confirmation stale',
            detail: `Last income log was ${daysSince} days ago and is outside expected cycle timing.`,
            affects: ['safe-to-spend', 'prioritization'],
          }))
        } else if (daysSince > 14) {
          pushGap(createGapItem({
            id: 'income:stale-warning',
            category: 'income',
            severity: 'warning',
            title: 'Income log not recent',
            detail: `Last income log was ${daysSince} days ago. Confirm current cycle soon.`,
            affects: ['prioritization'],
          }))
        }
      }
    }

    if (input.profile && isPayday(input.profile)) {
      const latestIncomeDate = parseDateSafe(sortedIncomeEntries[0]?.date)
      const hasLogToday = latestIncomeDate ? isToday(latestIncomeDate) : false

      if (!hasLogToday) {
        pushGap(createGapItem({
          id: 'income:payday-confirmation',
          category: 'income',
          severity: 'warning',
          title: 'Payday confirmation pending',
          detail: 'Expected payday detected but no income log for today yet.',
          affects: ['prioritization'],
        }))
      }
    }
  }

  const incomeBlockingCount = groupedMissingItems.income.blocking.length
  const incomeWarningCount = groupedMissingItems.income.warning.length
  categoryScores.income = Math.max(0, CATEGORY_MAX_SCORE - incomeBlockingCount * 8 - incomeWarningCount * 4)

  if (accounts.length === 0) {
    pushGap(createGapItem({
      id: 'account:none',
      category: 'account',
      severity: 'blocking',
      title: 'No accounts connected or tracked',
      detail: 'At least one account is needed for reliable system confidence.',
      affects: ['safe-to-spend', 'trust'],
    }))
  } else {
    const linkedCount = accounts.filter(account => account.is_linked || !!account.provider).length

    if (linkedCount === 0) {
      pushGap(createGapItem({
        id: 'account:manual-only',
        category: 'account',
        severity: 'warning',
        title: 'Manual-only account tracking',
        detail: 'Linked account sync would improve trust and reduce stale-balance risk.',
        affects: ['trust'],
      }))
    }
  }

  const accountBlockingCount = groupedMissingItems.account.blocking.length
  const accountWarningCount = groupedMissingItems.account.warning.length
  categoryScores.account = Math.max(0, CATEGORY_MAX_SCORE - accountBlockingCount * 10 - accountWarningCount * 4)

  const blockingItems = (Object.values(groupedMissingItems) as Array<{ blocking: SetupGapItem[]; warning: SetupGapItem[] }>)
    .flatMap(group => group.blocking)
  const setupWarnings = (Object.values(groupedMissingItems) as Array<{ blocking: SetupGapItem[]; warning: SetupGapItem[] }>)
    .flatMap(group => group.warning)

  const completionScore = clampScore(
    categoryScores.debt +
    categoryScores.obligation +
    categoryScores.savings +
    categoryScores.income +
    categoryScores.account,
  )

  const trustLevel = resolveTrustLevel(completionScore, blockingItems.length)
  const missingItemsCount = blockingItems.length + setupWarnings.length

  const weakensSafeToSpend = [...blockingItems, ...setupWarnings].some(item => item.affects.includes('safe-to-spend'))
  const weakensPrioritization = [...blockingItems, ...setupWarnings].some(item => item.affects.includes('prioritization'))
  const weakensTrust = [...blockingItems, ...setupWarnings].some(item => item.affects.includes('trust'))

  const categoryProgress: SetupCompletenessCategoryProgress[] = (Object.keys(CATEGORY_LABELS) as SetupGapCategory[]).map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    score: clampScore(categoryScores[category]),
    maxScore: CATEGORY_MAX_SCORE,
    isComplete: groupedMissingItems[category].blocking.length === 0 && groupedMissingItems[category].warning.length === 0,
  }))

  const explanation = `${completionScore}% setup complete with ${blockingItems.length} blocking gap${blockingItems.length === 1 ? '' : 's'} and ${setupWarnings.length} optional improvement${setupWarnings.length === 1 ? '' : 's'}. Trust is ${trustLevel}.`

  return {
    completionScore,
    missingItemsCount,
    blockingItems,
    setupWarnings,
    trustLevel,
    explanation,
    groupedMissingItems,
    categoryProgress,
    confidenceImpact: {
      weakensSafeToSpend,
      weakensPrioritization,
      weakensTrust,
    },
  }
}
