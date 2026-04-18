import { describe, expect, it } from 'vitest'
import { evaluateWeeklyPressure, getTimingBucketLabel } from './weeklyPressure'
import type { Bill, Debt, Obligation } from '@/types'

describe('weekly pressure utility', () => {
  it('computes dueSoon, upcoming, and conservative undated obligation protection', () => {
    const asOfDate = new Date('2026-04-17T10:00:00.000Z')

    const bills: Bill[] = [
      {
        id: 'bill-1',
        user_id: 'user-1',
        name: 'Rent',
        amount: 120,
        frequency: 'monthly',
        next_due_date: '2026-04-20',
        category: 'housing',
        is_paid_this_cycle: false,
        is_active: true,
      },
    ]

    const obligations: Obligation[] = [
      {
        id: 'ob-1',
        user_id: 'user-1',
        name: 'Family Support',
        type: 'family',
        amount_type: 'fixed',
        amount: 50,
        percentage_of: null,
        cadence: 'monthly',
        frequency: 'monthly',
        is_fulfilled_this_cycle: false,
        is_active: true,
        enabled: true,
      },
    ]

    const debts: Debt[] = [
      {
        id: 'debt-1',
        user_id: 'user-1',
        creditor_name: 'Card',
        type: 'credit_card',
        original_balance: 2000,
        current_balance: 500,
        interest_rate: 0,
        is_interest_free: false,
        minimum_payment: 80,
        payment_frequency: 'monthly',
        next_payment_date: '2026-04-27',
        is_settled: false,
      },
    ]

    const result = evaluateWeeklyPressure({
      bills,
      obligations,
      debts,
      asOfDate,
      safeToSpend: 120,
    })

    expect(result.protectedThisWeek).toBe(170)
    expect(result.dueSoonCount).toBe(1)
    expect(result.upcomingCount).toBe(1)
    expect(result.attentionLevel).toBe('watch')
    expect(result.nextPressurePoint?.id).toBe('bill:bill-1')

    const obligationItem = result.attentionItems.find(item => item.sourceType === 'obligation')
    expect(obligationItem?.timingBucket).toBe('undated')
    expect(obligationItem?.includedInProtection).toBe(true)
    expect(result.explanation).toContain('undated fixed obligation')
  })

  it('raises attention on strong negative pressure even without dueSoon items', () => {
    const result = evaluateWeeklyPressure({
      bills: [
        {
          id: 'bill-upcoming',
          user_id: 'user-1',
          name: 'Insurance',
          amount: 200,
          frequency: 'monthly',
          next_due_date: '2026-04-30',
          category: 'finance',
          is_paid_this_cycle: false,
          is_active: true,
        },
      ],
      obligations: [],
      debts: [],
      asOfDate: new Date('2026-04-17T10:00:00.000Z'),
      safeToSpend: -260,
    })

    expect(result.dueSoonCount).toBe(0)
    expect(result.upcomingCount).toBe(1)
    expect(result.attentionLevel).toBe('attention')
  })

  it('returns calm with no near-term pressure and positive safe-to-spend', () => {
    const result = evaluateWeeklyPressure({
      bills: [],
      obligations: [],
      debts: [],
      asOfDate: new Date('2026-04-17T10:00:00.000Z'),
      safeToSpend: 80,
    })

    expect(result.protectedThisWeek).toBe(0)
    expect(result.dueSoonCount).toBe(0)
    expect(result.upcomingCount).toBe(0)
    expect(result.attentionLevel).toBe('calm')
    expect(result.nextPressurePoint).toBeNull()
    expect(result.attentionItems).toHaveLength(0)
  })

  it('provides stable timing bucket labels', () => {
    expect(getTimingBucketLabel('dueSoon')).toBe('Due within 7 days')
    expect(getTimingBucketLabel('upcoming')).toBe('Due in 8 to 21 days')
    expect(getTimingBucketLabel('undated')).toBe('No due date set')
  })
})
