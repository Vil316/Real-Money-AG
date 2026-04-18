import { differenceInCalendarDays, endOfWeek, parseISO, startOfDay } from 'date-fns'
import { formatCurrency, isPayday } from '@/lib/utils'
import type {
  ActionCenterAction,
  ActionCenterInput,
  ActionCenterPriority,
  ActionCenterResult,
  Debt,
  Obligation,
  SafeToSpendResult,
  SavingsGoal,
} from '@/types'

const DEFAULT_TOP_ACTIONS = 3
const PRIORITY_ORDER: Record<ActionCenterPriority, number> = {
  urgent: 0,
  'due-soon': 1,
  'missing-setup': 2,
  planning: 3,
  reassurance: 4,
}

type InternalAction = ActionCenterAction & {
  priorityRank: number
  sortDays: number | null
}

function toFiniteNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toStartOfDay(value: unknown): Date | null {
  if (!value) return null

  const parsed = value instanceof Date
    ? value
    : typeof value === 'string'
      ? parseISO(value)
      : null

  if (!parsed || !Number.isFinite(parsed.getTime())) return null
  return startOfDay(parsed)
}

function daysUntil(value: unknown, asOfDate: Date): number | null {
  const parsed = toStartOfDay(value)
  if (!parsed) return null
  return differenceInCalendarDays(parsed, asOfDate)
}

function getObligationDueDate(obligation: Obligation): unknown {
  const withOptionalDates = obligation as Obligation & {
    next_due_date?: unknown
    next_payment_date?: unknown
    due_date?: unknown
  }

  const candidates = [withOptionalDates.due_date, withOptionalDates.next_due_date, withOptionalDates.next_payment_date]

  for (const candidate of candidates) {
    const parsed = toStartOfDay(candidate)
    if (parsed) return candidate
  }

  return null
}

function getSafeToSpendValue(value: ActionCenterInput['safeToSpend']): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (value && typeof value === 'object') {
    const result = value as SafeToSpendResult
    if (typeof result.safeToSpend === 'number' && Number.isFinite(result.safeToSpend)) {
      return result.safeToSpend
    }
  }

  return null
}

function formatDue(days: number | null): string {
  if (days === null) return 'date missing'
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'due today'
  if (days === 1) return 'due tomorrow'
  return `due in ${days}d`
}

function buildSavingsSuggestion(goals: SavingsGoal[]): SavingsGoal | null {
  const activeGoals = goals
    .filter((goal) => {
      const current = toFiniteNumber(goal.current_amount)
      const target = toFiniteNumber(goal.target_amount)
      return !goal.is_completed && target > current
    })

  if (activeGoals.length === 0) return null

  const withWeeklyPlan = activeGoals
    .filter(goal => toFiniteNumber(goal.weekly_contribution) > 0)
    .sort((a, b) => {
      const aRemaining = Math.max(0, toFiniteNumber(a.target_amount) - toFiniteNumber(a.current_amount))
      const bRemaining = Math.max(0, toFiniteNumber(b.target_amount) - toFiniteNumber(b.current_amount))
      const aWeeks = Math.ceil(aRemaining / Math.max(toFiniteNumber(a.weekly_contribution), 1))
      const bWeeks = Math.ceil(bRemaining / Math.max(toFiniteNumber(b.weekly_contribution), 1))

      if (aWeeks !== bWeeks) return aWeeks - bWeeks
      return aRemaining - bRemaining
    })

  if (withWeeklyPlan.length > 0) return withWeeklyPlan[0]

  return [...activeGoals].sort((a, b) => {
    const aRemaining = Math.max(0, toFiniteNumber(a.target_amount) - toFiniteNumber(a.current_amount))
    const bRemaining = Math.max(0, toFiniteNumber(b.target_amount) - toFiniteNumber(b.current_amount))
    return aRemaining - bRemaining
  })[0]
}

function buildStatusLine(counts: ActionCenterResult['counts']): string {
  if (counts.urgent > 0) return `${counts.urgent} urgent action${counts.urgent === 1 ? '' : 's'} need attention`
  if (counts.dueSoon > 0) return `${counts.dueSoon} action${counts.dueSoon === 1 ? '' : 's'} due soon`
  if (counts.missingSetup > 0) return `${counts.missingSetup} setup item${counts.missingSetup === 1 ? '' : 's'} missing`
  if (counts.planning > 0) return `${counts.planning} planning step${counts.planning === 1 ? '' : 's'} ready`
  return 'System steady'
}

function sortActions(actions: InternalAction[]): ActionCenterAction[] {
  return [...actions]
    .sort((left, right) => {
      if (left.priorityRank !== right.priorityRank) return left.priorityRank - right.priorityRank

      if (left.sortDays !== null || right.sortDays !== null) {
        if (left.sortDays === null) return 1
        if (right.sortDays === null) return -1
        if (left.sortDays !== right.sortDays) return left.sortDays - right.sortDays
      }

      return left.title.localeCompare(right.title)
    })
    .map(({ priorityRank, sortDays, ...action }) => action)
}

function createAction(action: ActionCenterAction, sortDays: number | null = null): InternalAction {
  return {
    ...action,
    priorityRank: PRIORITY_ORDER[action.priority],
    sortDays,
  }
}

export function buildActionCenterModel(input: ActionCenterInput = {}): ActionCenterResult {
  const bills = Array.isArray(input.bills) ? input.bills : []
  const obligations = Array.isArray(input.obligations) ? input.obligations : []
  const debts = Array.isArray(input.debts) ? input.debts : []
  const savingsGoals = Array.isArray(input.savingsGoals) ? input.savingsGoals : []
  const incomeEntries = Array.isArray(input.incomeEntries) ? input.incomeEntries : []
  const todayPrimaryActions = Array.isArray(input.todayPrimaryActions) ? input.todayPrimaryActions : []

  const asOfDate = input.asOfDate instanceof Date && Number.isFinite(input.asOfDate.getTime())
    ? startOfDay(input.asOfDate)
    : startOfDay(new Date())

  const weeklyPressureAttention = input.weeklyPressure?.attentionLevel ?? null
  const safeToSpendValue = getSafeToSpendValue(input.safeToSpend)
  const includeReassurance = input.includeReassurance !== false

  const actionMap = new Map<string, InternalAction>()

  const pushAction = (action: InternalAction) => {
    if (!actionMap.has(action.id)) {
      actionMap.set(action.id, action)
      return
    }

    const current = actionMap.get(action.id)
    if (!current) return

    if (action.priorityRank < current.priorityRank) {
      actionMap.set(action.id, action)
    }
  }

  todayPrimaryActions.forEach((item) => {
    const priority = item.priority ?? 'planning'

    pushAction(createAction({
      id: `today:${item.id}`,
      title: item.title,
      detail: item.detail,
      sourceType: 'today',
      priority,
      actionLabel: item.actionLabel || 'Open',
      routeHint: item.routeHint,
      callbackHint: item.callbackHint,
    }))
  })

  bills.forEach((bill) => {
    if (!bill || bill.is_paid_this_cycle || bill.is_active === false) return

    const dueDays = daysUntil(bill.next_due_date, asOfDate)
    const amount = toFiniteNumber(bill.amount)

    if (dueDays !== null && dueDays < 0) {
      pushAction(createAction({
        id: `bill:${bill.id}`,
        title: `Pay ${bill.name}`,
        detail: `${formatCurrency(amount)} · ${formatDue(dueDays)}`,
        sourceType: 'bill',
        priority: 'urgent',
        actionLabel: 'Pay',
        routeHint: '/money',
        callbackHint: 'mark_bill_paid',
      }, dueDays))
      return
    }

    if (dueDays !== null && dueDays <= 7) {
      pushAction(createAction({
        id: `bill:${bill.id}`,
        title: `Review and pay ${bill.name}`,
        detail: `${formatCurrency(amount)} · ${formatDue(dueDays)}`,
        sourceType: 'bill',
        priority: 'due-soon',
        actionLabel: 'Pay',
        routeHint: '/money',
        callbackHint: 'mark_bill_paid',
      }, dueDays))
      return
    }

    if (dueDays === null) {
      pushAction(createAction({
        id: `bill-date:${bill.id}`,
        title: `Set due date for ${bill.name}`,
        detail: 'Bill timing is missing and should be reviewed.',
        sourceType: 'bill',
        priority: 'missing-setup',
        actionLabel: 'Review',
        routeHint: '/money',
      }))
    }
  })

  obligations.forEach((obligation) => {
    if (!obligation || obligation.is_fulfilled_this_cycle || obligation.is_active === false || obligation.enabled === false) return

    const dueDate = getObligationDueDate(obligation)
    const dueDays = daysUntil(dueDate, asOfDate)
    const amount = toFiniteNumber(obligation.amount)

    if (obligation.amount_type === 'fixed' && amount <= 0) {
      pushAction(createAction({
        id: `obligation-amount:${obligation.id}`,
        title: `Add amount for ${obligation.name}`,
        detail: 'Fixed obligation amount is missing.',
        sourceType: 'obligation',
        priority: 'missing-setup',
        actionLabel: 'Set amount',
        routeHint: '/obligations',
      }))
      return
    }

    if (dueDays === null) {
      if (import.meta.env.DEV) {
        console.warn('[action-center] obligation timing still missing', {
          obligationId: obligation.id,
          next_due_date: (obligation as Obligation & { next_due_date?: unknown }).next_due_date,
          next_payment_date: (obligation as Obligation & { next_payment_date?: unknown }).next_payment_date,
          due_date: (obligation as Obligation & { due_date?: unknown }).due_date,
        })
      }

      pushAction(createAction({
        id: `obligation-date:${obligation.id}`,
        title: `Set timing for ${obligation.name}`,
        detail: 'Obligation has no due timing to confirm this cycle.',
        sourceType: 'obligation',
        priority: 'missing-setup',
        actionLabel: 'Set timing',
        routeHint: '/obligations',
        callbackHint: 'set_obligation_due_date',
      }))
      return
    }

    if (dueDays < 0) {
      pushAction(createAction({
        id: `obligation:${obligation.id}`,
        title: `Confirm ${obligation.name}`,
        detail: `${formatDue(dueDays)} · cycle confirmation pending`,
        sourceType: 'obligation',
        priority: 'urgent',
        actionLabel: 'Confirm',
        routeHint: '/obligations',
        callbackHint: 'mark_obligation_done',
      }, dueDays))
      return
    }

    if (dueDays <= 7) {
      pushAction(createAction({
        id: `obligation:${obligation.id}`,
        title: `Confirm ${obligation.name}`,
        detail: `${formatDue(dueDays)} · keep protection current`,
        sourceType: 'obligation',
        priority: 'due-soon',
        actionLabel: 'Confirm',
        routeHint: '/obligations',
        callbackHint: 'mark_obligation_done',
      }, dueDays))
      return
    }

    if (dueDays <= 21) {
      pushAction(createAction({
        id: `obligation-plan:${obligation.id}`,
        title: `Plan ${obligation.name}`,
        detail: `${formatDue(dueDays)} · schedule this cycle`,
        sourceType: 'obligation',
        priority: 'planning',
        actionLabel: 'Review',
        routeHint: '/obligations',
      }, dueDays))
    }
  })

  let highestDebt: Debt | null = null

  debts.forEach((debt: Debt) => {
    if (!debt || debt.is_settled) return

    const currentBalance = toFiniteNumber(debt.current_balance)
    const minimumPayment = toFiniteNumber(debt.minimum_payment)
    const debtTitle = debt.name?.trim() || debt.creditor_name?.trim() || 'Debt'

    if (!highestDebt || currentBalance > toFiniteNumber(highestDebt.current_balance)) {
      highestDebt = debt
    }

    if (minimumPayment <= 0) {
      if (import.meta.env.DEV) {
        console.warn('[action-center] debt minimum still missing', {
          debtId: debt.id,
          minimum_payment: debt.minimum_payment,
        })
      }

      pushAction(createAction({
        id: `debt-min:${debt.id}`,
        title: `Add minimum payment for ${debtTitle}`,
        detail: 'Debt priority cannot be evaluated without a minimum payment.',
        sourceType: 'debt',
        priority: 'missing-setup',
        actionLabel: 'Add minimum',
        routeHint: `/debts/${debt.id}`,
        callbackHint: 'update_debt_minimum_payment',
      }))
      return
    }

    const dueDays = daysUntil(debt.next_payment_date, asOfDate)

    if (dueDays === null) {
      pushAction(createAction({
        id: `debt-date:${debt.id}`,
        title: `Set payment timing for ${debtTitle}`,
        detail: 'Next payment date is missing.',
        sourceType: 'debt',
        priority: 'missing-setup',
        actionLabel: 'Set date',
        routeHint: `/debts/${debt.id}`,
        callbackHint: 'set_debt_payment_date',
      }))
      return
    }

    if (dueDays < 0) {
      pushAction(createAction({
        id: `debt:${debt.id}`,
        title: `Review ${debtTitle} payment`,
        detail: `${formatCurrency(minimumPayment)} minimum · ${formatDue(dueDays)}`,
        sourceType: 'debt',
        priority: 'urgent',
        actionLabel: 'Review',
        routeHint: `/debts/${debt.id}`,
      }, dueDays))
      return
    }

    if (dueDays <= 7) {
      pushAction(createAction({
        id: `debt:${debt.id}`,
        title: `Review ${debtTitle} payment`,
        detail: `${formatCurrency(minimumPayment)} minimum · ${formatDue(dueDays)}`,
        sourceType: 'debt',
        priority: 'due-soon',
        actionLabel: 'Review',
        routeHint: `/debts/${debt.id}`,
      }, dueDays))
    }
  })

  if (highestDebt) {
  const topDebt: Debt | null = highestDebt
  if (topDebt) {
    const highestTitle = topDebt.name?.trim() || topDebt.creditor_name?.trim() || 'Debt'
    pushAction(createAction({
      id: `debt-focus:${topDebt.id}`,
      title: `Review ${highestTitle} strategy`,
      detail: `${formatCurrency(toFiniteNumber(topDebt.current_balance))} remains on your largest balance.`,
      sourceType: 'debt',
      priority: 'planning',
      actionLabel: 'Open',
      routeHint: `/debts/${topDebt.id}`,
    }))
  }

  const sortedIncomeEntries = [...incomeEntries]
    .filter(entry => !!entry?.date)
    .sort((left, right) => right.date.localeCompare(left.date))

  if (input.profile && toFiniteNumber(input.profile.income_amount) > 0) {
    const hasIncomeLoggedToday = sortedIncomeEntries.some((entry) => {
      const entryDate = toStartOfDay(entry?.date)
      if (!entryDate) return false
      return differenceInCalendarDays(asOfDate, entryDate) === 0
    })

    if (isPayday(input.profile) && !hasIncomeLoggedToday) {
      if (import.meta.env.DEV) {
        console.warn('[action-center] payday income log still missing for today', {
          incomeDay: input.profile.income_day,
          expectedAmount: input.profile.income_amount,
          latestIncomeDate: sortedIncomeEntries[0]?.date || null,
        })
      }

      pushAction(createAction({
        id: 'income:payday',
        title: 'Log expected income',
        detail: `${formatCurrency(toFiniteNumber(input.profile.income_amount))} ready to confirm.`,
        sourceType: 'income',
        priority: 'due-soon',
        actionLabel: 'Log',
        routeHint: '/today',
        callbackHint: 'log_income',
      }))
    }

    if (sortedIncomeEntries.length === 0) {
      if (import.meta.env.DEV) {
        console.warn('[action-center] first income log still missing', {
          expectedAmount: input.profile.income_amount,
          userId: input.profile.id,
        })
      }

      pushAction(createAction({
        id: 'income:first-log',
        title: 'Log your first income entry',
        detail: 'Income confirmation is missing for this cycle.',
        sourceType: 'income',
        priority: 'missing-setup',
        actionLabel: 'Log income',
        routeHint: '/money',
        callbackHint: 'log_income',
      }))
    } else {
      const latestIncomeDate = toStartOfDay(sortedIncomeEntries[0]?.date)
      if (latestIncomeDate) {
        const daysSince = Math.max(differenceInCalendarDays(asOfDate, latestIncomeDate), 0)
        if (daysSince > 14) {
          pushAction(createAction({
            id: 'income:confirm',
            title: 'Confirm recent income',
            detail: `Last income log was ${daysSince} day${daysSince === 1 ? '' : 's'} ago.`,
            sourceType: 'income',
            priority: 'planning',
            actionLabel: 'Review',
            routeHint: '/money',
          }))
        }
      }
    }
  }

  const suggestedGoal = buildSavingsSuggestion(savingsGoals)
  const activeSavingsGoals = savingsGoals.filter((goal) => {
    const current = toFiniteNumber(goal.current_amount)
    const target = toFiniteNumber(goal.target_amount)
    return !goal.is_completed && target > current
  })

  activeSavingsGoals.forEach((goal) => {
    const weekly = toFiniteNumber(goal.weekly_contribution)
    if (weekly > 0) return

    if (import.meta.env.DEV) {
      console.warn('[action-center] savings weekly plan still missing', {
        goalId: goal.id,
        weekly_contribution: goal.weekly_contribution,
      })
    }

    pushAction(createAction({
      id: `savings-plan:${goal.id}`,
      title: `Set weekly plan for ${goal.name}`,
      detail: 'Goal needs a weekly contribution target.',
      sourceType: 'savings',
      priority: 'missing-setup',
      actionLabel: 'Set plan',
      routeHint: `/savings/${goal.id}`,
      callbackHint: 'set_weekly_contribution',
    }))
  })

  if (suggestedGoal) {
    const remaining = Math.max(0, toFiniteNumber(suggestedGoal.target_amount) - toFiniteNumber(suggestedGoal.current_amount))

    pushAction(createAction({
      id: `savings-support:${suggestedGoal.id}`,
      title: `Support ${suggestedGoal.name}`,
      detail: `${formatCurrency(remaining)} remaining. Most realistic next goal to move this week.`,
      sourceType: 'savings',
      priority: 'planning',
      actionLabel: 'Contribute',
      routeHint: `/savings/${suggestedGoal.id}`,
    }))
  }

  const reviewWindowDays = Math.max(differenceInCalendarDays(endOfWeek(asOfDate, { weekStartsOn: 1 }), asOfDate), 0)
  if (reviewWindowDays <= 2) {
    pushAction(createAction({
      id: 'review:weekly',
      title: 'Run weekly check-in',
      detail: `Weekly review due in ${reviewWindowDays} day${reviewWindowDays === 1 ? '' : 's'}.`,
      sourceType: 'review',
      priority: 'planning',
      actionLabel: 'Review',
      routeHint: '/checkin',
    }, reviewWindowDays))
  }

  if (safeToSpendValue !== null && safeToSpendValue < 0) {
    pushAction(createAction({
      id: 'system:protect-cash',
      title: 'Stabilize safe-to-spend first',
      detail: `${formatCurrency(safeToSpendValue)} safe to spend. Pause optional contributions and review due actions.`,
      sourceType: 'system',
      priority: 'urgent',
      actionLabel: 'Review',
      routeHint: '/today',
    }))
  } else if (weeklyPressureAttention === 'attention') {
    pushAction(createAction({
      id: 'system:pressure-watch',
      title: 'Prioritize protection this week',
      detail: 'Near-term pressure is elevated. Resolve due actions before optional planning.',
      sourceType: 'system',
      priority: 'due-soon',
      actionLabel: 'Review',
      routeHint: '/today',
    }))
  }

  if (actionMap.size === 0 && includeReassurance) {
    pushAction(createAction({
      id: 'system:steady',
      title: 'Keep your rhythm steady',
      detail: 'No urgent actions detected. Maintain your weekly planning cadence.',
      sourceType: 'system',
      priority: 'reassurance',
      actionLabel: 'Open',
      routeHint: '/today',
    }))
  }

  const actions = sortActions([...actionMap.values()])

  const counts: ActionCenterResult['counts'] = {
    urgent: actions.filter(action => action.priority === 'urgent').length,
    dueSoon: actions.filter(action => action.priority === 'due-soon').length,
    missingSetup: actions.filter(action => action.priority === 'missing-setup').length,
    planning: actions.filter(action => action.priority === 'planning').length,
    reassurance: actions.filter(action => action.priority === 'reassurance').length,
  }

  const maxTopActions = typeof input.maxTopActions === 'number' && Number.isFinite(input.maxTopActions) && input.maxTopActions > 0
    ? Math.floor(input.maxTopActions)
    : DEFAULT_TOP_ACTIONS

  return {
    actions,
    topActions: actions.slice(0, maxTopActions),
    statusLine: buildStatusLine(counts),
    counts,
  }
}

export function getTopActionCenterActions(input: ActionCenterInput = {}): ActionCenterAction[] {
  return buildActionCenterModel(input).topActions
}
