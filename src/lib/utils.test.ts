import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { advanceDueDate, calculateSafeToSpend, getActionItems } from './utils'
import type { Account, Bill, Debt, Obligation, Profile, SavingsGoal, Subscription } from '@/types'

describe('financial helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-16T09:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calculates safe to spend from liquid cash and near-term commitments', () => {
    const accounts: Account[] = [
      {
        id: 'acc-1',
        user_id: 'user-1',
        name: 'Main',
        type: 'bank',
        balance: 1200,
        currency: 'GBP',
        is_manual: true,
        is_archived: false,
        last_updated: '2026-04-15T00:00:00.000Z',
      },
      {
        id: 'acc-2',
        user_id: 'user-1',
        name: 'Cash',
        type: 'cash',
        balance: 300,
        currency: 'GBP',
        is_manual: true,
        is_archived: false,
        last_updated: '2026-04-15T00:00:00.000Z',
      },
      {
        id: 'acc-3',
        user_id: 'user-1',
        name: 'Savings',
        type: 'savings',
        balance: 5000,
        currency: 'GBP',
        is_manual: true,
        is_archived: false,
        last_updated: '2026-04-15T00:00:00.000Z',
      },
    ]

    const bills: Bill[] = [
      {
        id: 'bill-1',
        user_id: 'user-1',
        name: 'Rent',
        amount: 200,
        frequency: 'monthly',
        next_due_date: '2026-04-20',
        category: 'housing',
        is_paid_this_cycle: false,
        is_active: true,
      },
      {
        id: 'bill-2',
        user_id: 'user-1',
        name: 'Gym',
        amount: 80,
        frequency: 'monthly',
        next_due_date: '2026-05-10',
        category: 'health',
        is_paid_this_cycle: false,
        is_active: true,
      },
    ]

    const obligations: Obligation[] = [
      {
        id: 'ob-1',
        user_id: 'user-1',
        name: 'Giving',
        type: 'giving',
        amount_type: 'fixed',
        amount: 50,
        frequency: 'monthly',
        is_fulfilled_this_cycle: false,
        is_active: true,
      },
      {
        id: 'ob-2',
        user_id: 'user-1',
        name: 'Tithe',
        type: 'tithe',
        amount_type: 'percentage',
        percentage_of: 'income_weekly',
        frequency: 'monthly',
        is_fulfilled_this_cycle: false,
        is_active: true,
      },
    ]

    const debts: Debt[] = [
      {
        id: 'debt-1',
        user_id: 'user-1',
        creditor_name: 'Card',
        type: 'credit_card',
        original_balance: 1000,
        current_balance: 400,
        interest_rate: 0,
        is_interest_free: false,
        minimum_payment: 75,
        payment_frequency: 'monthly',
        next_payment_date: '2026-04-18',
        is_settled: false,
      },
    ]

    expect(calculateSafeToSpend({ accounts, bills, obligations, debts })).toEqual({
      safe: 1025,
      liquid: 1500,
      protectedBills: 200,
      protectedObs: 125,
      buffer: 150,
    })
  })

  it('advances recurring due dates correctly', () => {
    expect(advanceDueDate('2026-04-16', 'weekly')).toBe('2026-04-23')
    expect(advanceDueDate('2026-04-16', 'monthly')).toBe('2026-05-16')
    expect(advanceDueDate('2026-04-16', 'quarterly')).toBe('2026-07-16')
    expect(advanceDueDate('2026-04-16', 'annual')).toBe('2027-04-16')
  })

  it('orders action items by urgency and includes mark-paid actions', () => {
    const profile: Profile = {
      id: 'user-1',
      display_name: 'Vilson',
      currency: 'GBP',
      income_frequency: 'monthly',
      income_amount: 2500,
      income_day: 5,
      tithe_percentage: 10,
      onboarding_complete: true,
    }

    const bills: Bill[] = [
      {
        id: 'bill-overdue',
        user_id: 'user-1',
        name: 'Council Tax',
        amount: 140,
        frequency: 'monthly',
        next_due_date: '2026-04-14',
        category: 'housing',
        is_paid_this_cycle: false,
        is_active: true,
      },
      {
        id: 'bill-soon',
        user_id: 'user-1',
        name: 'Electric',
        amount: 60,
        frequency: 'monthly',
        next_due_date: '2026-04-18',
        category: 'utilities',
        is_paid_this_cycle: false,
        is_active: true,
      },
    ]

    const subscriptions: Subscription[] = []
    const debts: Debt[] = []
    const savingsGoals: SavingsGoal[] = []
    const obligations: Obligation[] = [
      {
        id: 'ob-1',
        user_id: 'user-1',
        name: 'Family Support',
        type: 'family',
        amount_type: 'fixed',
        amount: 80,
        frequency: 'monthly',
        is_fulfilled_this_cycle: false,
        is_active: true,
      },
    ]

    const items = getActionItems({
      bills,
      subscriptions,
      debts,
      obligations,
      savingsGoals,
      incomeEntries: [],
      profile,
    })

    expect(items.map(item => item.id)).toEqual(['bill_bill-overdue', 'bill_bill-soon', 'ob_ob-1'])
    expect(items[0]?.priority).toBe('high')
    expect(items[1]?.canMarkPaid).toBe(true)
  })

  it('returns an all-clear action when there is nothing due', () => {
    const items = getActionItems({
      bills: [],
      subscriptions: [],
      debts: [],
      obligations: [],
      savingsGoals: [],
      incomeEntries: [],
      profile: null,
    })

    expect(items).toHaveLength(1)
    expect(items[0]?.id).toBe('all_good')
  })
})