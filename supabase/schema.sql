-- ==========================================
-- REALMONEY SUPABASE SCHEMA
-- Paste this script directly into your Supabase SQL Editor
-- ==========================================

-- Enable the UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT NOT NULL,
  currency TEXT DEFAULT 'GBP',
  income_frequency TEXT,
  income_amount NUMERIC DEFAULT 0,
  income_day INTEGER,
  tithe_percentage NUMERIC DEFAULT 0,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ACCOUNTS
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  balance NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'GBP',
  colour TEXT,
  icon TEXT,
  is_manual BOOLEAN DEFAULT TRUE,
  notes TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BILLS
CREATE TABLE IF NOT EXISTS public.bills (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL,
  next_due_date DATE NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  category TEXT,
  is_paid_this_cycle BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT
);

-- 4. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL,
  next_billing_date DATE NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  category TEXT,
  status TEXT DEFAULT 'active',
  cancelled_at DATE,
  notes TEXT
);

-- 5. SAVINGS GOALS
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC DEFAULT 0,
  target_date DATE,
  linked_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  colour TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  is_challenge BOOLEAN DEFAULT FALSE,
  weekly_contribution NUMERIC DEFAULT 0
);

-- 6. SAVINGS CONTRIBUTIONS
CREATE TABLE IF NOT EXISTS public.savings_contributions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  goal_id UUID REFERENCES public.savings_goals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  notes TEXT
);

-- 7. DEBTS
CREATE TABLE IF NOT EXISTS public.debts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  creditor_name TEXT NOT NULL,
  type TEXT NOT NULL,
  original_balance NUMERIC NOT NULL,
  current_balance NUMERIC NOT NULL,
  interest_rate NUMERIC DEFAULT 0,
  is_interest_free BOOLEAN DEFAULT FALSE,
  minimum_payment NUMERIC,
  payment_frequency TEXT,
  next_payment_date DATE,
  bnpl_instalments JSONB,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  notes TEXT,
  is_settled BOOLEAN DEFAULT FALSE
);

-- 8. OBLIGATIONS (e.g. Tithes / Giving)
CREATE TABLE IF NOT EXISTS public.obligations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  amount_type TEXT NOT NULL,
  amount NUMERIC,
  percentage_of TEXT,
  frequency TEXT NOT NULL,
  is_fulfilled_this_cycle BOOLEAN DEFAULT FALSE,
  last_fulfilled_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- 9. INCOME ENTRIES
CREATE TABLE IF NOT EXISTS public.income_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  week_reference TEXT,
  payment_method TEXT NOT NULL,
  notes TEXT
);

-- 10. ACTION ITEMS
CREATE TABLE IF NOT EXISTS public.action_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  priority TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC,
  due_date DATE,
  reference_id UUID,
  reference_type TEXT,
  can_mark_paid BOOLEAN DEFAULT FALSE,
  can_mark_done BOOLEAN DEFAULT FALSE
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
-- Ensure strict user isolation so individuals only ever read/write their own data

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;

-- Profiles uses 'id' instead of 'user_id' because it directly mirrors auth.users
CREATE POLICY "Users can fully control their own profiles" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Helper to quickly generate generic policies for the rest of the tables
DO $$ 
DECLARE
  table_name text;
BEGIN
  FOR table_name IN SELECT UNNEST(ARRAY['accounts', 'bills', 'subscriptions', 'savings_goals', 'savings_contributions', 'debts', 'obligations', 'income_entries', 'action_items'])
  LOOP
    EXECUTE format('CREATE POLICY "Users can fully control their own %I" ON public.%I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);', table_name, table_name);
  END LOOP;
END $$;
