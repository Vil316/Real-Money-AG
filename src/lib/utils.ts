import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Account, Profile, Bill, Subscription, Obligation, SavingsGoal, IncomeEntry, ActionItem, FrequencyType, Debt } from '@/types'
import { differenceInDays, add, format, parseISO, isToday, isTomorrow } from 'date-fns'

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

export function calculateSafeToSpend(data: {
  accounts: Account[],
  bills: Bill[],
  obligations: Obligation[],
  debts: Debt[]
}): { safe: number, liquid: number, protectedBills: number, protectedObs: number, buffer: number } {
  const liquidAccounts = data.accounts.filter(a => a.type === 'bank' || a.type === 'cash')
  const liquid = liquidAccounts.reduce((sum, a) => sum + Number(a.balance), 0)

  const protectedBills = data.bills
    .filter(b => !b.is_paid_this_cycle && daysUntil(b.next_due_date) <= 7)
    .reduce((sum, b) => sum + Number(b.amount), 0)

  const protectedObs = data.obligations
    .filter(o => !o.is_fulfilled_this_cycle && o.amount_type === 'fixed')
    .reduce((sum, o) => sum + Number(o.amount || 0), 0)

  const pendingDebts = data.debts
    .filter(d => !d.is_settled && d.next_payment_date && daysUntil(d.next_payment_date) <= 7)
    .reduce((sum, d) => sum + Number(d.minimum_payment || 0), 0)

  const buffer = 150 // Static MVP buffer

  const safe = liquid - protectedBills - protectedObs - pendingDebts - buffer
  return { safe: safe < 0 ? 0 : safe, liquid, protectedBills, protectedObs: protectedObs + pendingDebts, buffer }
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
