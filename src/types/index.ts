export type AccountType =
  'bank' | 'cash' | 'credit_card' | 'bnpl' |
  'loan' | 'informal_debt' | 'savings'

export type FrequencyType =
  'weekly' | 'monthly' | 'quarterly' | 'annual' | 'one-off'

export type ObligationType = 'tithe' | 'family' | 'giving' | 'other'

export type PaymentMethod =
  'cash' | 'bank_transfer' | 'card' | 'other'

export type SubscriptionStatus = 'active' | 'cancelled' | 'paused'

export type ActionItemType =
  'bill_due' | 'subscription_due' | 'obligation_due' |
  'savings_behind' | 'bnpl_due' | 'overdue' |
  'payday' | 'checkin_reminder' | 'all_good'

export interface Profile {
  id: string
  display_name: string
  currency: string
  income_frequency: string
  income_amount: number
  income_day: number
  tithe_percentage: number
  onboarding_complete: boolean
}

export interface Account {
  id: string
  user_id: string
  name: string
  type: AccountType
  balance: number
  currency: string
  colour: string
  icon: string
  is_manual: boolean
  notes?: string
  is_archived: boolean
  last_updated: string
}

export interface Bill {
  id: string
  user_id: string
  name: string
  amount: number
  frequency: FrequencyType
  next_due_date: string
  account_id?: string
  category: string
  is_paid_this_cycle: boolean
  is_active: boolean
  notes?: string
}

export interface Subscription {
  id: string
  user_id: string
  name: string
  amount: number
  frequency: FrequencyType
  next_billing_date: string
  account_id?: string
  category: string
  status: SubscriptionStatus
  cancelled_at?: string
  notes?: string
}

export interface SavingsGoal {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  target_date?: string
  linked_account_id?: string
  colour: string
  is_completed: boolean
  is_challenge: boolean
  weekly_contribution: number
}

export interface SavingsContribution {
  id: string
  goal_id: string
  user_id: string
  amount: number
  date: string
  notes?: string
}

export interface Debt {
  id: string
  user_id: string
  creditor_name: string
  type: string
  original_balance: number
  current_balance: number
  interest_rate: number
  is_interest_free: boolean
  minimum_payment?: number
  payment_frequency: string
  next_payment_date?: string
  bnpl_instalments?: BNPLInstalment[]
  account_id?: string
  notes?: string
  is_settled: boolean
}

export interface BNPLInstalment {
  due: string
  amount: number
  paid: boolean
}

export interface Obligation {
  id: string
  user_id: string
  name: string
  type: ObligationType
  amount_type: 'fixed' | 'percentage'
  amount?: number
  percentage_of?: string
  frequency: FrequencyType
  is_fulfilled_this_cycle: boolean
  last_fulfilled_date?: string
  notes?: string
  is_active: boolean
}

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  amount: number
  currency: string
  date: string
  merchant: string
  category: string
  is_pending: boolean
  notes?: string
}

export interface IncomeEntry {
  id: string
  user_id: string
  amount: number
  date: string
  week_reference: string
  payment_method: PaymentMethod
  notes?: string
}

export interface ActionItem {
  id: string
  type: ActionItemType
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  amount?: number
  dueDate?: string
  referenceId?: string
  referenceType?: string
  canMarkPaid?: boolean
  canMarkDone?: boolean
}
