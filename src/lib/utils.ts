import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type {
  Account,
  Profile,
  Bill,
  Subscription,
  Obligation,
  SavingsGoal,
  IncomeEntry,
  ActionItem,
  FrequencyType,
  Debt,
  SafeToSpendInput,
  SafeToSpendResult,
  SafeToSpendStatus,
} from '@/types'
import { differenceInCalendarDays, differenceInDays, add, format, parseISO, isToday, isTomorrow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd MMM yyyy')
}

export function daysUntil(date: string | Date): number {
  if (!date) return 0
  const d = typeof date === 'string' ? parseISO(date) : date
  return differenceInDays(d, new Date())
}

export function dueDateLabel(date: string | Date): string {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  const diff = differenceInDays(d, new Date())
  if (diff < 0) return `${Math.abs(diff)} days overdue`
  return `In ${diff} days`
}

export function getCurrentWeekRef(): string {
  return format(new Date(), "yyyy-'W'ww")
}

export function isPayday(profile: Profile): boolean {
  if (!profile) return false
  if (profile.income_frequency !== 'weekly') return false 
  // Map index from logic
  let dayIdx = new Date().getDay()
  if (dayIdx === 0) dayIdx = 7 // adjust sunday to 7 maybe?
  return dayIdx === profile.income_day
}

export function calculateNetPosition(accounts: Account[]): number {
  return accounts.reduce((sum, acc) => {
    if (acc.type === 'loan' || acc.type === 'informal_debt') {
      return sum - Number(acc.balance)
    }
    return sum + Number(acc.balance)
  }, 0)
}

const SAFE_TO_SPEND_WINDOW_DAYS = 7
const DEFAULT_SAFETY_BUFFER = 150

function toFiniteNumber(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function getDaysUntilDate(value: unknown, asOfDate: Date): number | null {
  if (!value) return null

  const parsed = value instanceof Date ? value : typeof value === 'string' ? parseISO(value) : null
  if (!parsed || !Number.isFinite(parsed.getTime())) return null

  return differenceInCalendarDays(parsed, asOfDate)
}

function isDueWithinWindow(value: unknown, asOfDate: Date): boolean {
  const diff = getDaysUntilDate(value, asOfDate)
  return diff !== null && diff >= 0 && diff <= SAFE_TO_SPEND_WINDOW_DAYS
}

function extractObligationDueDate(obligation: Obligation): unknown {
  const withOptionalDates = obligation as Obligation & {
    next_due_date?: unknown
    next_payment_date?: unknown
    due_date?: unknown
  }

  return withOptionalDates.next_due_date ?? withOptionalDates.next_payment_date ?? withOptionalDates.due_date
}

function resolveSafetyBuffer(profile: Profile | null | undefined): number {
  if (!profile) return DEFAULT_SAFETY_BUFFER

  const withAltBuffer = profile as Profile & { safetyBuffer?: number | null }
  const raw = profile.safety_buffer ?? withAltBuffer.safetyBuffer
  if (raw === null || raw === undefined) return DEFAULT_SAFETY_BUFFER

  const numeric = toFiniteNumber(raw)
  return numeric >= 0 ? numeric : DEFAULT_SAFETY_BUFFER
}

function resolveSafeToSpendStatus(value: number): SafeToSpendStatus {
  if (value >= 200) return 'calm'
  if (value >= 0) return 'tight'
  return 'attention'
}

function formatCurrencySafe(amount: number, currency: string): string {
  try {
    return formatCurrency(amount, currency)
  } catch {
    return formatCurrency(amount, 'GBP')
  }
}

function buildSafeToSpendExplanation(data: Omit<SafeToSpendResult, 'explanation'> & {
  currency: string
  includedUndatedObligations: number
}): string {
  const opening = `Liquid cash is ${formatCurrencySafe(data.liquidMoney, data.currency)}.`
  const protection = `${formatCurrencySafe(data.protectedBills, data.currency)} is protected for bills, ${formatCurrencySafe(data.nearTermObligations, data.currency)} for near-term obligations, and ${formatCurrencySafe(data.safetyBuffer, data.currency)} for your safety buffer.`

  const statusLine = data.status === 'calm'
    ? `You have ${formatCurrencySafe(data.safeToSpend, data.currency)} safe to spend right now.`
    : data.status === 'tight'
      ? `You have ${formatCurrencySafe(data.safeToSpend, data.currency)} safe to spend, so this week is tight.`
      : `You're ${formatCurrencySafe(Math.abs(data.safeToSpend), data.currency)} below safe-to-spend and need attention.`

  const assumptionLine = data.includedUndatedObligations > 0
    ? ' Some obligations with no explicit due date were treated as near-term for safety.'
    : ''

  return `${opening} ${protection} ${statusLine}${assumptionLine}`
}

export function calculateSafeToSpend(data: SafeToSpendInput = {}): SafeToSpendResult {
  const accounts = Array.isArray(data.accounts) ? data.accounts : []
  const bills = Array.isArray(data.bills) ? data.bills : []
  const obligations = Array.isArray(data.obligations) ? data.obligations : []
  const debts = Array.isArray(data.debts) ? data.debts : []
  const asOfDate = data.asOfDate instanceof Date && Number.isFinite(data.asOfDate.getTime())
    ? data.asOfDate
    : new Date()

  const liquidMoney = accounts.reduce((sum, account) => {
    if (!account || account.is_archived) return sum
    if (account.type !== 'bank' && account.type !== 'cash') return sum

    const balance = toFiniteNumber(account.balance)
    return balance > 0 ? sum + balance : sum
  }, 0)

  const protectedBills = bills.reduce((sum, bill) => {
    if (!bill || bill.is_paid_this_cycle || bill.is_active === false) return sum
    if (!isDueWithinWindow(bill.next_due_date, asOfDate)) return sum

    const amount = toFiniteNumber(bill.amount)
    return amount > 0 ? sum + amount : sum
  }, 0)

  let includedUndatedObligations = 0

  const obligationDue = obligations.reduce((sum, obligation) => {
    if (!obligation || obligation.is_fulfilled_this_cycle || obligation.is_active === false) return sum
    if (obligation.amount_type !== 'fixed') return sum

    const affectsProtectedMoney = obligation.affects_protected_money !== false
    if (!affectsProtectedMoney) return sum

    const amount = toFiniteNumber(obligation.amount)
    if (amount <= 0) return sum

    const dueDate = extractObligationDueDate(obligation)
    if (dueDate && !isDueWithinWindow(dueDate, asOfDate)) return sum
    if (!dueDate) includedUndatedObligations += 1

    return sum + amount
  }, 0)

  const debtMinimumDue = debts.reduce((sum, debt) => {
    if (!debt || debt.is_settled) return sum
    if (!isDueWithinWindow(debt.next_payment_date, asOfDate)) return sum

    const minimum = toFiniteNumber(debt.minimum_payment)
    return minimum > 0 ? sum + minimum : sum
  }, 0)

  const nearTermObligations = obligationDue + debtMinimumDue
  const safetyBuffer = resolveSafetyBuffer(data.profile)
  const safeToSpend = liquidMoney - protectedBills - nearTermObligations - safetyBuffer
  const status = resolveSafeToSpendStatus(safeToSpend)
  const currency = typeof data.profile?.currency === 'string' && data.profile.currency.trim().length > 0
    ? data.profile.currency
    : 'GBP'

  return {
    liquidMoney,
    protectedBills,
    nearTermObligations,
    safetyBuffer,
    safeToSpend,
    status,
    explanation: buildSafeToSpendExplanation({
      liquidMoney,
      protectedBills,
      nearTermObligations,
      safetyBuffer,
      safeToSpend,
      status,
      currency,
      includedUndatedObligations,
    }),
  }
}

export function totalActiveSubscriptions(subscriptions: Subscription[]): number {
  return subscriptions
    .filter(sub => sub.status === 'active')
    .reduce((sum, sub) => sum + Number(sub.amount), 0)
}

export function totalBillsThisMonth(bills: Bill[]): number {
  return bills.reduce((sum, b) => sum + Number(b.amount), 0)
}

export function totalCancelledSavings(subscriptions: Subscription[]): number {
  return subscriptions
    .filter(sub => sub.status === 'cancelled')
    .reduce((sum, sub) => sum + Number(sub.amount), 0)
}

export function advanceDueDate(date: string, frequency: FrequencyType): string {
  const current = parseISO(date)
  switch (frequency) {
    case 'weekly': return format(add(current, { weeks: 1 }), 'yyyy-MM-dd')
    case 'monthly': return format(add(current, { months: 1 }), 'yyyy-MM-dd')
    case 'quarterly': return format(add(current, { months: 3 }), 'yyyy-MM-dd')
    case 'annual': return format(add(current, { years: 1 }), 'yyyy-MM-dd')
    default: return date
  }
}

export function getActionItems(data: {
  bills: Bill[],
  subscriptions: Subscription[],
  debts: Debt[],
  obligations: Obligation[],
  savingsGoals: SavingsGoal[],
  incomeEntries: IncomeEntry[],
  profile: Profile | null
}): ActionItem[] {
  const items: ActionItem[] = []
  
  if (data.profile && isPayday(data.profile)) {
    items.push({
      id: 'payday',
      type: 'payday',
      priority: 'low',
      title: 'I just got paid 💷',
      description: `Expected: ${formatCurrency(data.profile.income_amount)}`,
    })
  }

  // Bills
  data.bills.forEach(bill => {
    if (bill.is_paid_this_cycle) return
    const diff = daysUntil(bill.next_due_date)
    if (diff <= 7) {
      items.push({
        id: `bill_${bill.id}`,
        type: diff < 0 ? 'overdue' : 'bill_due',
        priority: diff < 0 ? 'high' : diff <= 3 ? 'medium' : 'low',
        title: bill.name,
        description: `${formatCurrency(bill.amount)} · ${dueDateLabel(bill.next_due_date)}`,
        canMarkPaid: true,
        referenceId: bill.id,
      })
    }
  })

  // Obligations
  data.obligations.forEach(ob => {
    if (ob.is_fulfilled_this_cycle) return
    items.push({
      id: `ob_${ob.id}`,
      type: 'obligation_due',
      priority: 'low',
      title: ob.name,
      description: 'Pending for this cycle',
      canMarkDone: true,
      referenceId: ob.id,
    })
  })

  // Sort: High priority first, then medium, then low
  const pMap = { high: 0, medium: 1, low: 2 }
  items.sort((a, b) => pMap[a.priority] - pMap[b.priority])

  if (items.length === 0) {
    items.push({
      id: 'all_good',
      type: 'all_good',
      priority: 'low',
      title: "You're on top of everything 🎉",
      description: "Nothing needs your attention right now.",
    })
  }

  return items
}
