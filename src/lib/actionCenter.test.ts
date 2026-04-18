import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildActionCenterModel, getTopActionCenterActions } from './actionCenter'
import type { Bill, Debt, IncomeEntry, Obligation, Profile, SavingsGoal, WeeklyPressureResult } from '@/types'

describe('action center model', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-18T09:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('prioritizes urgent and due-soon actions ahead of setup and planning', () => {
    const bills: Bill[] = [
      {
        id: 'bill-1',
        user_id: 'user-1',
        name: 'Rent',
        amount: 900,
        frequency: 'monthly',
        next_due_date: '2026-04-16',
        category: 'housing',
        is_paid_this_cycle: false,
        is_active: true,
      },
      {
        id: 'bill-2',
        user_id: 'user-1',
        name: 'Water',
        amount: 45,
        frequency: 'monthly',
        next_due_date: '2026-04-20',
        category: 'utilities',
        is_paid_this_cycle: false,
        is_active: true,
      },
    ]

    const debts: Debt[] = [
      {
        id: 'debt-1',
        user_id: 'user-1',
        creditor_name: 'Card One',
        type: 'credit_card',
        original_balance: 1000,
        current_balance: 400,
        interest_rate: 18,
        is_interest_free: false,
        minimum_payment: 50,
        payment_frequency: 'monthly',
        next_payment_date: '2026-04-22',
        is_settled: false,
      },
      {
        id: 'debt-2',
        user_id: 'user-1',
        creditor_name: 'Store Card',
        type: 'credit_card',
        original_balance: 1200,
        current_balance: 900,
        interest_rate: 19,
        is_interest_free: false,
        minimum_payment: 0,
        payment_frequency: 'monthly',
        next_payment_date: '2026-04-30',
        is_settled: false,
      },
    ]

    const savingsGoals: SavingsGoal[] = [
      {
        id: 'goal-1',
        user_id: 'user-1',
        name: 'Emergency Buffer',
        target_amount: 1000,
        current_amount: 200,
        colour: '#0B8289',
        is_completed: false,
        is_challenge: false,
        weekly_contribution: 0,
      },
    ]

    const model = buildActionCenterModel({
      bills,
      debts,
      savingsGoals,
      safeToSpend: 300,
      asOfDate: new Date('2026-04-18T09:00:00.000Z'),
      includeReassurance: false,
    })

    expect(model.actions[0]?.priority).toBe('urgent')
    expect(model.actions[0]?.id).toBe('bill:bill-1')
    expect(model.actions[1]?.priority).toBe('due-soon')
    expect(model.actions.some(action => action.id === 'debt-min:debt-2')).toBe(true)
    expect(model.actions.some(action => action.id === 'savings-plan:goal-1')).toBe(true)
    expect(model.topActions).toHaveLength(3)
  })

  it('adds income and weekly review planning actions when appropriate', () => {
    const profile: Profile = {
      id: 'user-1',
      display_name: 'Test',
      currency: 'GBP',
      income_frequency: 'weekly',
      income_amount: 800,
      income_day: 6,
      tithe_percentage: 0,
      onboarding_complete: true,
    }

    const incomeEntries: IncomeEntry[] = [
      {
        id: 'inc-1',
        user_id: 'user-1',
        amount: 800,
        date: '2026-03-20',
        week_reference: '2026-W12',
        payment_method: 'bank_transfer',
      },
    ]

    const model = buildActionCenterModel({
      profile,
      incomeEntries,
      asOfDate: new Date('2026-04-18T09:00:00.000Z'),
      includeReassurance: false,
    })

    expect(model.actions.some(action => action.id === 'income:payday')).toBe(true)
    expect(model.actions.some(action => action.id === 'income:confirm')).toBe(true)
    expect(model.actions.some(action => action.id === 'review:weekly')).toBe(true)
    expect(model.statusLine.length).toBeGreaterThan(0)
  })

  it('returns reassurance action when no actionable items exist', () => {
    const model = buildActionCenterModel({
      bills: [],
      debts: [],
      obligations: [],
      savingsGoals: [],
      incomeEntries: [],
      includeReassurance: true,
    })

    expect(model.actions).toHaveLength(1)
    expect(model.actions[0]?.priority).toBe('reassurance')
    expect(model.topActions[0]?.id).toBe('system:steady')
  })

  it('caps top actions using helper', () => {
    const weeklyPressure: WeeklyPressureResult = {
      protectedThisWeek: 400,
      dueSoonCount: 2,
      upcomingCount: 1,
      attentionLevel: 'attention',
      nextPressurePoint: null,
      attentionItems: [],
      explanation: 'test',
    }

    const bills: Bill[] = [
      {
        id: 'bill-a',
        user_id: 'u1',
        name: 'A',
        amount: 10,
        frequency: 'monthly',
        next_due_date: '2026-04-19',
        category: 'x',
        is_paid_this_cycle: false,
        is_active: true,
      },
      {
        id: 'bill-b',
        user_id: 'u1',
        name: 'B',
        amount: 20,
        frequency: 'monthly',
        next_due_date: '2026-04-20',
        category: 'x',
        is_paid_this_cycle: false,
        is_active: true,
      },
      {
        id: 'bill-c',
        user_id: 'u1',
        name: 'C',
        amount: 30,
        frequency: 'monthly',
        next_due_date: '2026-04-21',
        category: 'x',
        is_paid_this_cycle: false,
        is_active: true,
      },
      {
        id: 'bill-d',
        user_id: 'u1',
        name: 'D',
        amount: 40,
        frequency: 'monthly',
        next_due_date: '2026-04-22',
        category: 'x',
        is_paid_this_cycle: false,
        is_active: true,
      },
    ]

    const top = getTopActionCenterActions({
      bills,
      weeklyPressure,
      maxTopActions: 3,
      includeReassurance: false,
      asOfDate: new Date('2026-04-18T09:00:00.000Z'),
    })

    expect(top).toHaveLength(3)
  })
})
