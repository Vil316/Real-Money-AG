import type { Account, Profile, Bill, Subscription, Obligation, SavingsGoal, IncomeEntry, Debt } from '@/types'

export const mockDB = {
  profile: {
    id: 'mock-user-123',
    display_name: 'Vilson',
    currency: 'GBP',
    income_frequency: 'weekly',
    income_amount: 400,
    income_day: 1, // Monday
    tithe_percentage: 10,
    onboarding_complete: true
  } as Profile,
  accounts: [
    { id: 'a1', user_id: 'mock-user-123', name: 'Starling Personal', type: 'bank', balance: 1250.50, currency: 'GBP', colour: '#14b8a6', is_archived: false },
    { id: 'a2', user_id: 'mock-user-123', name: 'Monzo Pots', type: 'savings', balance: 400.00, currency: 'GBP', colour: '#ec4899', is_archived: false },
    { id: 'a3', user_id: 'mock-user-123', name: 'Amex Gold', type: 'credit_card', balance: -350.00, currency: 'GBP', colour: '#3b82f6', is_archived: false },
  ] as Account[],
  bills: [
    { id: 'b1', user_id: 'mock-user-123', name: 'Rent', amount: 800, frequency: 'monthly', next_due_date: '2026-05-01', is_paid_this_cycle: false, is_active: true, category: 'housing' },
    { id: 'b2', user_id: 'mock-user-123', name: 'Council Tax', amount: 150, frequency: 'monthly', next_due_date: '2026-04-18', is_paid_this_cycle: false, is_active: true, category: 'housing' },
  ] as Bill[],
  subscriptions: [
    { id: 's1', user_id: 'mock-user-123', name: 'Netflix', amount: 10.99, frequency: 'monthly', next_billing_date: '2026-04-20', status: 'active', category: 'entertainment' },
    { id: 's2', user_id: 'mock-user-123', name: 'Gym', amount: 35, frequency: 'monthly', next_billing_date: '2026-04-28', status: 'active', category: 'health' },
    { id: 's3', user_id: 'mock-user-123', name: 'Spotify', amount: 9.99, frequency: 'monthly', next_billing_date: '2026-04-25', status: 'cancelled', category: 'entertainment' },
  ] as Subscription[],
  debts: [
    { id: 'd1', user_id: 'mock-user-123', name: 'Mom', creditor_name: 'Mom', type: 'informal_debt', original_balance: 1000, current_balance: 400, is_interest_free: true, is_settled: false },
    { id: 'd2', user_id: 'mock-user-123', name: 'Klarna Frame', creditor_name: 'Klarna', type: 'bnpl', original_balance: 150, current_balance: 50, is_interest_free: true, is_settled: false, bnpl_instalments: [{ paid: true } as any, { paid: true } as any, { paid: false } as any] },
  ] as Debt[],
  obligations: [
    { id: 'o1', user_id: 'mock-user-123', name: 'Tithe', type: 'tithe', amount_type: 'percentage', percentage_of: 'income_weekly', frequency: 'weekly', is_fulfilled_this_cycle: false, amount: 40, is_active: true },
  ] as Obligation[],
  savingsGoals: [
    { id: 'g1', user_id: 'mock-user-123', name: 'Emergency Fund', target_amount: 5000, current_amount: 1200, is_completed: false, is_challenge: true, weekly_contribution: 50, colour: '#10b981' },
    { id: 'g2', user_id: 'mock-user-123', name: 'Holiday', target_amount: 800, current_amount: 300, is_completed: false, is_challenge: false, weekly_contribution: 20, colour: '#f59e0b' },
  ] as SavingsGoal[],
  incomeEntries: [
    { id: 'i1', user_id: 'mock-user-123', amount: 400, date: '2026-04-07', payment_method: 'bank_transfer', week_reference: '2026-W14' },
  ] as IncomeEntry[],
  transactions: [
    { id: 't1', user_id: 'mock-user-123', account_id: 'a1', amount: -6.50, currency: 'GBP', date: '2026-04-14T08:30:00Z', merchant: 'TfL Travel Charge', category: 'transport', is_pending: true },
    { id: 't2', user_id: 'mock-user-123', account_id: 'a1', amount: -24.99, currency: 'GBP', date: '2026-04-13T18:45:00Z', merchant: 'Tesco Express', category: 'groceries', is_pending: false },
    { id: 't3', user_id: 'mock-user-123', account_id: 'a1', amount: 400.00, currency: 'GBP', date: '2026-04-07T00:00:00Z', merchant: 'Salary (Weekly)', category: 'income', is_pending: false },
    { id: 't4', user_id: 'mock-user-123', account_id: 'a3', amount: -15.00, currency: 'GBP', date: '2026-04-12T12:00:00Z', merchant: 'Pret A Manger', category: 'eating_out', is_pending: false },
    { id: 't5', user_id: 'mock-user-123', account_id: 'a2', amount: 50.00, currency: 'GBP', date: '2026-04-10T15:00:00Z', merchant: 'Savings Transfer', category: 'transfer', is_pending: false },
  ] as any[] // using any internally to avoid circular import issues if Transaction isn't loaded yet
}
