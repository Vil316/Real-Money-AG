import { describe, expect, it } from 'vitest'
import { evaluateSetupCompleteness } from './setupCompleteness'
import type { Account, Debt, IncomeEntry, Profile, SavingsGoal } from '@/types'

describe('setup completeness', () => {
  it('returns high trust when setup is complete and consistent', () => {
    const accounts: Account[] = [
      {
        id: 'acc-1',
        user_id: 'user-1',
        name: 'Main Account',
        type: 'bank',
        balance: 1800,
        currency: 'GBP',
        is_manual: false,
        is_linked: true,
        provider: 'plaid',
        is_archived: false,
        last_updated: '2026-04-18',
      },
    ]

    const debts: Debt[] = [
      {
        id: 'debt-1',
        user_id: 'user-1',
        creditor_name: 'Card',
        type: 'credit_card',
        original_balance: 1500,
        current_balance: 600,
        interest_rate: 12,
        is_interest_free: false,
        minimum_payment: 60,
        payment_frequency: 'monthly',
        next_payment_date: '2026-04-25',
        is_settled: false,
      },
    ]

    const profile: Profile = {
      id: 'user-1',
      display_name: 'Test',
      currency: 'GBP',
      income_frequency: 'weekly',
      income_amount: 900,
      income_day: 2,
      tithe_percentage: 0,
      onboarding_complete: true,
    }

    const incomeEntries: IncomeEntry[] = [
      {
        id: 'inc-1',
        user_id: 'user-1',
        amount: 900,
        date: '2026-04-15',
        week_reference: '2026-W16',
        payment_method: 'bank_transfer',
      },
    ]

    const result = evaluateSetupCompleteness({
      accounts,
      debts,
      profile,
      incomeEntries,
      asOfDate: new Date('2026-04-18T09:00:00.000Z'),
    })

    expect(result.completionScore).toBe(100)
    expect(result.blockingItems).toHaveLength(0)
    expect(result.setupWarnings).toHaveLength(0)
    expect(result.trustLevel).toBe('high')
    expect(result.confidenceImpact.weakensSafeToSpend).toBe(false)
  })

  it('creates blocking gaps for debt timing, debt minimum, and missing accounts', () => {
    const debts: Debt[] = [
      {
        id: 'debt-1',
        user_id: 'user-1',
        creditor_name: 'Card',
        type: 'credit_card',
        original_balance: 1200,
        current_balance: 900,
        interest_rate: 19,
        is_interest_free: false,
        minimum_payment: 0,
        payment_frequency: 'monthly',
        next_payment_date: '',
        is_settled: false,
      },
    ]

    const result = evaluateSetupCompleteness({
      accounts: [],
      debts,
      asOfDate: new Date('2026-04-18T09:00:00.000Z'),
    })

    expect(result.blockingItems.some(item => item.id === 'account:none')).toBe(true)
    expect(result.blockingItems.some(item => item.id === 'debt:min:debt-1')).toBe(true)
    expect(result.blockingItems.some(item => item.id === 'debt:due:debt-1')).toBe(true)
    expect(result.confidenceImpact.weakensSafeToSpend).toBe(true)
    expect(result.trustLevel).toBe('low')
  })

  it('classifies non-critical setup gaps as warnings', () => {
    const accounts: Account[] = [
      {
        id: 'acc-1',
        user_id: 'user-1',
        name: 'Cash Wallet',
        type: 'cash',
        balance: 200,
        currency: 'GBP',
        is_manual: true,
        is_linked: false,
        is_archived: false,
        last_updated: '2026-04-18',
      },
    ]

    const savingsGoals: SavingsGoal[] = [
      {
        id: 'goal-1',
        user_id: 'user-1',
        name: 'Travel',
        target_amount: 800,
        current_amount: 200,
        colour: '#0B8289',
        is_completed: false,
        is_challenge: false,
        weekly_contribution: 0,
      },
    ]

    const profile: Profile = {
      id: 'user-1',
      display_name: 'Test',
      currency: 'GBP',
      income_frequency: 'monthly',
      income_amount: 2500,
      income_day: 1,
      tithe_percentage: 0,
      onboarding_complete: true,
    }

    const incomeEntries: IncomeEntry[] = [
      {
        id: 'inc-1',
        user_id: 'user-1',
        amount: 2500,
        date: '2026-03-25',
        week_reference: '2026-W13',
        payment_method: 'bank_transfer',
      },
    ]

    const result = evaluateSetupCompleteness({
      accounts,
      savingsGoals,
      profile,
      incomeEntries,
      asOfDate: new Date('2026-04-18T09:00:00.000Z'),
    })

    expect(result.blockingItems).toHaveLength(0)
    expect(result.setupWarnings.some(item => item.id === 'account:manual-only')).toBe(true)
    expect(result.setupWarnings.some(item => item.id === 'savings:weekly:goal-1')).toBe(true)
    expect(result.setupWarnings.some(item => item.id === 'income:stale-warning')).toBe(true)
    expect(result.confidenceImpact.weakensPrioritization).toBe(true)
    expect(result.confidenceImpact.weakensTrust).toBe(true)
  })

  it('marks missing income logs as blocking when income is expected', () => {
    const profile: Profile = {
      id: 'user-1',
      display_name: 'Test',
      currency: 'GBP',
      income_frequency: 'weekly',
      income_amount: 1000,
      income_day: 5,
      tithe_percentage: 0,
      onboarding_complete: true,
    }

    const result = evaluateSetupCompleteness({
      accounts: [
        {
          id: 'acc-1',
          user_id: 'user-1',
          name: 'Main',
          type: 'bank',
          balance: 500,
          currency: 'GBP',
          is_manual: false,
          is_linked: true,
          provider: 'plaid',
          is_archived: false,
          last_updated: '2026-04-18',
        },
      ],
      profile,
      incomeEntries: [],
      asOfDate: new Date('2026-04-18T09:00:00.000Z'),
    })

    expect(result.blockingItems.some(item => item.id === 'income:no-log')).toBe(true)
    expect(result.groupedMissingItems.income.blocking).toHaveLength(1)
    expect(result.explanation).toContain('blocking gap')
  })
})
