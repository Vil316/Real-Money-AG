export type AccountType =
  'bank' | 'cash' | 'credit_card' | 'bnpl' |
  'loan' | 'informal_debt' | 'savings'

export type FrequencyType =
  'weekly' | 'monthly' | 'quarterly' | 'annual' | 'one-off'

export type ObligationType = 'tithe' | 'family' | 'giving' | 'other' | (string & {})

export type ObligationAmountType = 'fixed' | 'percentage'

export type ObligationCadence =
  | 'weekly'
  | 'every_2_weeks'
  | 'monthly'
  | 'payday_linked'
  | 'quarterly'
  | 'annual'
  | 'one-off'
  | 'custom'

export interface RawObligation {
  id?: string | null
  user_id?: string | null
  name?: string | null
  type?: ObligationType | null
  amount_type?: ObligationAmountType | null
  amount?: number | null
  percentage_of?: string | null
  cadence?: ObligationCadence | null
  frequency?: FrequencyType | null
  due_date?: string | null
  next_due_date?: string | null
  next_payment_date?: string | null
  is_fulfilled_this_cycle?: boolean | null
  last_fulfilled_date?: string | null
  notes?: string | null
  is_active?: boolean | null
  enabled?: boolean | null
  affects_protected_money?: boolean | null
}

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
  safety_buffer?: number | null
  onboarding_complete: boolean
}

export interface Account {
  id: string
  user_id: string
  name: string
  type: AccountType
  balance: number
  currency: string
  colour?: string
  icon?: string
  is_manual: boolean
  is_linked?: boolean
  external_account_id?: string
  provider?: string
  notes?: string
  is_archived: boolean
  last_updated: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  parent_name?: string
  is_system: boolean
}

export interface Rule {
  id: string
  user_id: string
  match_type: string
  match_value: string
  assign_category_id?: string
  assign_merchant_name?: string
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
  name?: string
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
  amount_type: ObligationAmountType
  amount?: number | null
  percentage_of?: string | null
  cadence?: ObligationCadence | null
  frequency: FrequencyType
  due_date?: string | null
  next_due_date?: string | null
  next_payment_date?: string | null
  is_fulfilled_this_cycle: boolean
  last_fulfilled_date?: string | null
  notes?: string | null
  is_active: boolean
  enabled?: boolean | null
  affects_protected_money?: boolean | null
}

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  amount: number
  currency: string
  date: string
  merchant_raw: string
  merchant_clean?: string
  category_id?: string
  source_type?: string
  confidence_score?: number
  external_transaction_id?: string
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
  status?: string
  reasoning_json?: Record<string, any>
}

export type SafeToSpendStatus = 'calm' | 'tight' | 'attention'

export interface SafeToSpendInput {
  accounts?: Account[] | null
  bills?: Bill[] | null
  obligations?: Obligation[] | null
  debts?: Debt[] | null
  profile?: Profile | null
  asOfDate?: Date
}

export interface SafeToSpendResult {
  liquidMoney: number
  protectedBills: number
  nearTermObligations: number
  safetyBuffer: number
  safeToSpend: number
  status: SafeToSpendStatus
  explanation: string
}

export type PressureSourceType = 'bill' | 'obligation' | 'debt'

export type PressureTimingBucket = 'dueSoon' | 'upcoming' | 'undated'

export type WeeklyPressureAttentionLevel = 'calm' | 'watch' | 'attention'

export interface WeeklyPressureItem {
  id: string
  sourceType: PressureSourceType
  title: string
  amount: number
  dueDate?: string | null
  timingBucket: PressureTimingBucket
  includedInProtection: boolean
  metadata?: {
    undatedReason?: string
  }
}

export interface WeeklyPressureInput {
  bills?: Bill[] | null
  obligations?: Obligation[] | null
  debts?: Debt[] | null
  asOfDate?: Date
  safeToSpend?: number | null
  strongPressureThreshold?: number
}

export interface WeeklyPressureResult {
  protectedThisWeek: number
  dueSoonCount: number
  upcomingCount: number
  attentionLevel: WeeklyPressureAttentionLevel
  nextPressurePoint: WeeklyPressureItem | null
  attentionItems: WeeklyPressureItem[]
  explanation: string
}

export type ActionCenterPriority =
  | 'urgent'
  | 'due-soon'
  | 'missing-setup'
  | 'planning'
  | 'reassurance'

export type ActionCenterSourceType =
  | 'today'
  | 'bill'
  | 'obligation'
  | 'debt'
  | 'income'
  | 'savings'
  | 'review'
  | 'system'

export interface ActionCenterAction {
  id: string
  title: string
  detail: string
  sourceType: ActionCenterSourceType
  priority: ActionCenterPriority
  actionLabel: string
  routeHint?: string
  callbackHint?: string
}

export interface ActionCenterPrimaryActionInput {
  id: string
  title: string
  detail: string
  actionLabel?: string
  routeHint?: string
  callbackHint?: string
  priority?: ActionCenterPriority
}

export interface ActionCenterInput {
  bills?: Bill[] | null
  obligations?: Obligation[] | null
  debts?: Debt[] | null
  savingsGoals?: SavingsGoal[] | null
  incomeEntries?: IncomeEntry[] | null
  profile?: Profile | null
  safeToSpend?: number | SafeToSpendResult | null
  weeklyPressure?: WeeklyPressureResult | null
  todayPrimaryActions?: ActionCenterPrimaryActionInput[] | null
  asOfDate?: Date
  maxTopActions?: number
  includeReassurance?: boolean
}

export interface ActionCenterResult {
  actions: ActionCenterAction[]
  topActions: ActionCenterAction[]
  statusLine: string
  counts: {
    urgent: number
    dueSoon: number
    missingSetup: number
    planning: number
    reassurance: number
  }
}

export type SetupGapCategory = 'debt' | 'obligation' | 'savings' | 'income' | 'account'

export type SetupGapSeverity = 'blocking' | 'warning'

export type SetupTrustLevel = 'low' | 'medium' | 'high'

export type SetupConfidenceArea = 'safe-to-spend' | 'prioritization' | 'trust'

export interface SetupGapItem {
  id: string
  category: SetupGapCategory
  severity: SetupGapSeverity
  title: string
  detail: string
  affects: SetupConfidenceArea[]
}

export interface SetupCompletenessCategoryProgress {
  category: SetupGapCategory
  label: string
  score: number
  maxScore: number
  isComplete: boolean
}

export interface SetupCompletenessInput {
  accounts?: Account[] | null
  debts?: Debt[] | null
  obligations?: Obligation[] | null
  savingsGoals?: SavingsGoal[] | null
  incomeEntries?: IncomeEntry[] | null
  profile?: Profile | null
  asOfDate?: Date
}

export interface SetupCompletenessResult {
  completionScore: number
  missingItemsCount: number
  blockingItems: SetupGapItem[]
  setupWarnings: SetupGapItem[]
  trustLevel: SetupTrustLevel
  explanation: string
  groupedMissingItems: Record<SetupGapCategory, {
    blocking: SetupGapItem[]
    warning: SetupGapItem[]
  }>
  categoryProgress: SetupCompletenessCategoryProgress[]
  confidenceImpact: {
    weakensSafeToSpend: boolean
    weakensPrioritization: boolean
    weakensTrust: boolean
  }
}
