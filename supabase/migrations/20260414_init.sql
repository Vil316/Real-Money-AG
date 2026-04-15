-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT,
  currency TEXT DEFAULT 'GBP',
  income_frequency TEXT DEFAULT 'weekly',
  income_amount NUMERIC(10,2) DEFAULT 0,
  income_day INTEGER DEFAULT 1,
  tithe_percentage NUMERIC(5,2) DEFAULT 10,
  onboarding_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts
CREATE TABLE accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  balance NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'GBP',
  colour TEXT DEFAULT '#10b981',
  icon TEXT DEFAULT 'wallet',
  is_manual BOOLEAN DEFAULT true,
  notes TEXT,
  is_archived BOOLEAN DEFAULT false,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bills
CREATE TABLE bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  frequency TEXT DEFAULT 'monthly',
  next_due_date DATE NOT NULL,
  account_id UUID REFERENCES accounts(id),
  category TEXT DEFAULT 'bills',
  is_paid_this_cycle BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  frequency TEXT DEFAULT 'monthly',
  next_billing_date DATE NOT NULL,
  account_id UUID REFERENCES accounts(id),
  category TEXT DEFAULT 'entertainment',
  status TEXT DEFAULT 'active',
  cancelled_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Savings goals
CREATE TABLE savings_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC(10,2) NOT NULL,
  current_amount NUMERIC(10,2) DEFAULT 0,
  target_date DATE,
  linked_account_id UUID REFERENCES accounts(id),
  colour TEXT DEFAULT '#10b981',
  is_completed BOOLEAN DEFAULT false,
  is_challenge BOOLEAN DEFAULT false,
  weekly_contribution NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Savings contributions
CREATE TABLE savings_contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES savings_goals(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Debts
CREATE TABLE debts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  creditor_name TEXT NOT NULL,
  type TEXT DEFAULT 'credit_card',
  original_balance NUMERIC(10,2) NOT NULL,
  current_balance NUMERIC(10,2) NOT NULL,
  interest_rate NUMERIC(5,2) DEFAULT 0,
  is_interest_free BOOLEAN DEFAULT false,
  minimum_payment NUMERIC(10,2),
  payment_frequency TEXT DEFAULT 'monthly',
  next_payment_date DATE,
  bnpl_instalments JSONB,
  account_id UUID REFERENCES accounts(id),
  notes TEXT,
  is_settled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Debt payments
CREATE TABLE debt_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  debt_id UUID REFERENCES debts(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Obligations (tithe, family transfers, giving)
CREATE TABLE obligations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'other',
  amount_type TEXT DEFAULT 'fixed',
  amount NUMERIC(10,2),
  percentage_of TEXT DEFAULT 'income_weekly',
  frequency TEXT DEFAULT 'monthly',
  is_fulfilled_this_cycle BOOLEAN DEFAULT false,
  last_fulfilled_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Obligation fulfillments
CREATE TABLE obligation_fulfillments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  obligation_id UUID REFERENCES obligations(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Income entries
CREATE TABLE income_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  week_reference TEXT,
  payment_method TEXT DEFAULT 'bank_transfer',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: repeat this pattern for every table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_profiles" ON profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_accounts" ON accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_bills" ON bills FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_subscriptions" ON subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_savings_goals" ON savings_goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE savings_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_savings_contributions" ON savings_contributions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_debts" ON debts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_debt_payments" ON debt_payments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE obligations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_obligations" ON obligations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE obligation_fulfillments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_obligation_fulfillments" ON obligation_fulfillments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE income_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_income_entries" ON income_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
