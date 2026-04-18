import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import type {
  Bill,
  Debt,
  Obligation,
  PressureTimingBucket,
  WeeklyPressureAttentionLevel,
  WeeklyPressureInput,
  WeeklyPressureItem,
  WeeklyPressureResult,
} from '@/types'

const DUE_SOON_WINDOW_DAYS = 7
const UPCOMING_WINDOW_DAYS = 21
const DEFAULT_STRONG_PRESSURE_THRESHOLD = -200

function toFiniteNumber(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function parseDueDate(value: unknown): Date | null {
  if (!value) return null

  const parsed = value instanceof Date
    ? value
    : typeof value === 'string'
      ? parseISO(value)
      : null

  if (!parsed || !Number.isFinite(parsed.getTime())) return null
  return startOfDay(parsed)
}

function extractObligationDueDate(obligation: Obligation): unknown {
  const withOptionalDates = obligation as Obligation & {
    next_due_date?: unknown
    due_date?: unknown
    next_payment_date?: unknown
  }

  return withOptionalDates.next_due_date ?? withOptionalDates.due_date ?? withOptionalDates.next_payment_date
}

function getTimingBucketFromDate(dueDate: Date | null, asOfDate: Date): PressureTimingBucket | null {
  if (!dueDate) return 'undated'

  const diff = differenceInCalendarDays(dueDate, asOfDate)

  if (diff <= DUE_SOON_WINDOW_DAYS) {
    return 'dueSoon'
  }

  if (diff <= UPCOMING_WINDOW_DAYS) {
    return 'upcoming'
  }

  return null
}

export function getTimingBucketLabel(bucket: PressureTimingBucket): string {
  switch (bucket) {
    case 'dueSoon':
      return 'Due within 7 days'
    case 'upcoming':
      return 'Due in 8 to 21 days'
    case 'undated':
    default:
      return 'No due date set'
  }
}

function createBillPressureItem(bill: Bill, asOfDate: Date): WeeklyPressureItem | null {
  if (!bill || bill.is_active === false || bill.is_paid_this_cycle) return null

  const amount = toFiniteNumber(bill.amount)
  if (amount <= 0) return null

  const dueDate = parseDueDate(bill.next_due_date)
  const bucket = getTimingBucketFromDate(dueDate, asOfDate)

  if (!bucket) return null

  return {
    id: bill.id ? `bill:${bill.id}` : `bill:${bill.name}`,
    sourceType: 'bill',
    title: bill.name?.trim() || 'Bill',
    amount,
    dueDate: dueDate ? bill.next_due_date : null,
    timingBucket: bucket,
    includedInProtection: bucket === 'dueSoon',
    metadata: !dueDate ? { undatedReason: 'Bill has no valid due date' } : undefined,
  }
}

function createObligationPressureItem(obligation: Obligation, asOfDate: Date): WeeklyPressureItem | null {
  if (!obligation || obligation.is_fulfilled_this_cycle) return null
  if (obligation.is_active === false || obligation.enabled === false) return null
  if (obligation.amount_type !== 'fixed') return null

  const amount = toFiniteNumber(obligation.amount)
  if (amount <= 0) return null

  const affectsProtection = obligation.affects_protected_money !== false
  const rawDueDate = extractObligationDueDate(obligation)
  const dueDate = parseDueDate(rawDueDate)
  const bucket = getTimingBucketFromDate(dueDate, asOfDate)

  if (!bucket) return null

  const includedInProtection = affectsProtection && (bucket === 'dueSoon' || bucket === 'undated')

  return {
    id: obligation.id ? `obligation:${obligation.id}` : `obligation:${obligation.name}`,
    sourceType: 'obligation',
    title: obligation.name?.trim() || 'Obligation',
    amount,
    dueDate: dueDate ? String(rawDueDate) : null,
    timingBucket: bucket,
    includedInProtection,
    metadata: bucket === 'undated'
      ? { undatedReason: 'Fixed obligation has no explicit due date and is treated conservatively' }
      : undefined,
  }
}

function createDebtPressureItem(debt: Debt, asOfDate: Date): WeeklyPressureItem | null {
  if (!debt || debt.is_settled) return null

  const amount = toFiniteNumber(debt.minimum_payment)
  if (amount <= 0) return null

  const dueDate = parseDueDate(debt.next_payment_date)
  if (!dueDate) return null

  const bucket = getTimingBucketFromDate(dueDate, asOfDate)
  if (!bucket || bucket === 'undated') return null

  return {
    id: debt.id ? `debt:${debt.id}` : `debt:${debt.creditor_name}`,
    sourceType: 'debt',
    title: debt.name?.trim() || debt.creditor_name?.trim() || 'Debt payment',
    amount,
    dueDate: debt.next_payment_date || null,
    timingBucket: bucket,
    includedInProtection: bucket === 'dueSoon',
  }
}

function computeAttentionLevel(params: {
  dueSoonCount: number
  upcomingCount: number
  safeToSpend: number | null
  strongPressureThreshold: number
}): WeeklyPressureAttentionLevel {
  const { dueSoonCount, upcomingCount, safeToSpend, strongPressureThreshold } = params

  const hasNegativeSafeToSpendPressure = safeToSpend !== null && safeToSpend < 0
  const hasStrongPressure = safeToSpend !== null && safeToSpend <= strongPressureThreshold

  if (dueSoonCount === 0 && !hasNegativeSafeToSpendPressure) {
    return 'calm'
  }

  if (dueSoonCount >= 2 || hasStrongPressure) {
    return 'attention'
  }

  if (upcomingCount > 0 || dueSoonCount === 1 || hasNegativeSafeToSpendPressure) {
    return 'watch'
  }

  return 'watch'
}

function compareByDueDate(a: WeeklyPressureItem, b: WeeklyPressureItem): number {
  const aDate = parseDueDate(a.dueDate)
  const bDate = parseDueDate(b.dueDate)

  if (aDate && bDate) {
    return aDate.getTime() - bDate.getTime()
  }

  if (aDate) return -1
  if (bDate) return 1
  return 0
}

function buildExplanation(params: {
  protectedThisWeek: number
  dueSoonCount: number
  upcomingCount: number
  undatedProtectedObligationCount: number
  attentionLevel: WeeklyPressureAttentionLevel
  safeToSpend: number | null
}): string {
  const {
    protectedThisWeek,
    dueSoonCount,
    upcomingCount,
    undatedProtectedObligationCount,
    attentionLevel,
    safeToSpend,
  } = params

  const base = `${dueSoonCount} due soon and ${upcomingCount} upcoming. ${formatCurrency(protectedThisWeek)} is protected for this week.`

  const undated = undatedProtectedObligationCount > 0
    ? ` ${undatedProtectedObligationCount} undated fixed obligation${undatedProtectedObligationCount === 1 ? '' : 's'} ${undatedProtectedObligationCount === 1 ? 'is' : 'are'} included conservatively.`
    : ''

  const pressure = safeToSpend !== null && safeToSpend < 0
    ? ` Safe to spend is currently negative (${formatCurrency(safeToSpend)}), so pressure is elevated.`
    : ''

  return `${base} Attention level: ${attentionLevel}.${undated}${pressure}`
}

export function evaluateWeeklyPressure(input: WeeklyPressureInput = {}): WeeklyPressureResult {
  const asOfDate = input.asOfDate instanceof Date && Number.isFinite(input.asOfDate.getTime())
    ? startOfDay(input.asOfDate)
    : startOfDay(new Date())

  const bills = Array.isArray(input.bills) ? input.bills : []
  const obligations = Array.isArray(input.obligations) ? input.obligations : []
  const debts = Array.isArray(input.debts) ? input.debts : []
  const safeToSpend = typeof input.safeToSpend === 'number' && Number.isFinite(input.safeToSpend)
    ? input.safeToSpend
    : null
  const strongPressureThreshold = typeof input.strongPressureThreshold === 'number' && Number.isFinite(input.strongPressureThreshold)
    ? input.strongPressureThreshold
    : DEFAULT_STRONG_PRESSURE_THRESHOLD

  const items: WeeklyPressureItem[] = [
    ...bills
      .map(bill => createBillPressureItem(bill, asOfDate))
      .filter((item): item is WeeklyPressureItem => item !== null),
    ...obligations
      .map(obligation => createObligationPressureItem(obligation, asOfDate))
      .filter((item): item is WeeklyPressureItem => item !== null),
    ...debts
      .map(debt => createDebtPressureItem(debt, asOfDate))
      .filter((item): item is WeeklyPressureItem => item !== null),
  ]

  const dueSoonItems = items.filter(item => item.timingBucket === 'dueSoon')
  const upcomingItems = items.filter(item => item.timingBucket === 'upcoming')
  const undatedItems = items.filter(item => item.timingBucket === 'undated')

  const protectedThisWeek = items
    .filter(item => item.includedInProtection)
    .reduce((sum, item) => sum + item.amount, 0)

  const dueSoonCount = dueSoonItems.length
  const upcomingCount = upcomingItems.length

  const attentionLevel = computeAttentionLevel({
    dueSoonCount,
    upcomingCount,
    safeToSpend,
    strongPressureThreshold,
  })

  const sortedDueSoon = [...dueSoonItems].sort(compareByDueDate)
  const sortedUpcoming = [...upcomingItems].sort(compareByDueDate)
  const sortedUndated = [...undatedItems].sort(compareByDueDate)

  const nextPressurePoint = sortedDueSoon[0] ?? sortedUpcoming[0] ?? sortedUndated[0] ?? null

  const attentionItems = items.filter(item => {
    if (item.timingBucket === 'dueSoon') return true
    if (item.timingBucket === 'undated' && item.includedInProtection) return true
    if (item.timingBucket === 'upcoming' && dueSoonCount === 0) return true
    return false
  }).sort(compareByDueDate)

  const undatedProtectedObligationCount = undatedItems.filter(item => item.includedInProtection && item.sourceType === 'obligation').length

  return {
    protectedThisWeek,
    dueSoonCount,
    upcomingCount,
    attentionLevel,
    nextPressurePoint,
    attentionItems,
    explanation: buildExplanation({
      protectedThisWeek,
      dueSoonCount,
      upcomingCount,
      undatedProtectedObligationCount,
      attentionLevel,
      safeToSpend,
    }),
  }
}
