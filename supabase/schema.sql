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
  is_linked BOOLEAN DEFAULT FALSE,
  external_account_id TEXT,
  provider TEXT,
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

-- 9.5 CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_name TEXT,
  is_system BOOLEAN DEFAULT FALSE
);

-- OS DEFAULT CATEGORY SEEDING (Admin bypassed via raw insert)
INSERT INTO public.categories (id, user_id, name, parent_name, is_system)
VALUES 
  ('11111111-1111-1111-1111-111111111111', null, 'Housing', null, true),
  ('22222222-2222-2222-2222-222222222222', null, 'Transport', null, true),
  ('33333333-3333-3333-3333-333333333333', null, 'Food & Drink', null, true),
  ('44444444-4444-4444-4444-444444444444', null, 'Groceries', 'Food & Drink', true),
  ('55555555-5555-5555-5555-555555555555', null, 'Dining Out', 'Food & Drink', true),
  ('66666666-6666-6666-6666-666666666666', null, 'Shopping', null, true),
  ('77777777-7777-7777-7777-777777777777', null, 'Entertainment', null, true),
  ('88888888-8888-8888-8888-888888888888', null, 'Subscriptions', null, true),
  ('99999999-9999-9999-9999-999999999999', null, 'Bills & Utilities', null, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 'Health & Wellness', null, true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', null, 'Income', null, true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', null, 'Debt Repayment', null, true),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', null, 'Transfers', null, true)
ON CONFLICT (id) DO NOTHING;

-- 9.6 RULES
CREATE TABLE IF NOT EXISTS public.rules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  match_type TEXT NOT NULL,
  match_value TEXT NOT NULL,
  assign_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  assign_merchant_name TEXT
);

-- 9.7 PLAID CONNECTIONS (Strict Vault)
CREATE TABLE IF NOT EXISTS public.plaid_connections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  item_id TEXT NOT NULL,
  institution_name TEXT,
  sync_cursor TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ
);

-- 10. TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  merchant_raw TEXT NOT NULL,
  merchant_clean TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  source_type TEXT DEFAULT 'manual',
  confidence_score NUMERIC,
  external_transaction_id TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  is_pending BOOLEAN DEFAULT FALSE,
  currency TEXT DEFAULT 'GBP',
  notes TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_external_transaction_id_key
  ON public.transactions (user_id, external_transaction_id)
  WHERE external_transaction_id IS NOT NULL;

-- 11. ACTION ITEMS
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
  can_mark_done BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending',
  reasoning_json JSONB
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
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Profiles uses 'id' instead of 'user_id' because it directly mirrors auth.users
DROP POLICY IF EXISTS "Users can fully control their own profiles" ON public.profiles;
CREATE POLICY "Users can fully control their own profiles" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Helper to quickly generate generic policies for the rest of the tables
DO $$ 
DECLARE
  table_name text;
BEGIN
  FOR table_name IN SELECT UNNEST(ARRAY['accounts', 'bills', 'subscriptions', 'savings_goals', 'savings_contributions', 'debts', 'obligations', 'income_entries', 'categories', 'rules', 'action_items', 'transactions', 'plaid_connections'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Users can fully control their own %I" ON public.%I;', table_name, table_name);
    EXECUTE format('CREATE POLICY "Users can fully control their own %I" ON public.%I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);', table_name, table_name);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.insert_manual_transaction(
  p_account_id UUID,
  p_amount NUMERIC,
  p_merchant_raw TEXT,
  p_category_id UUID DEFAULT NULL,
  p_is_pending BOOLEAN DEFAULT FALSE,
  p_notes TEXT DEFAULT NULL,
  p_source_type TEXT DEFAULT 'manual',
  p_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  account_row public.accounts%ROWTYPE;
  new_transaction public.transactions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO account_row
  FROM public.accounts
  WHERE id = p_account_id
    AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found';
  END IF;

  INSERT INTO public.transactions (
    user_id,
    account_id,
    amount,
    merchant_raw,
    category_id,
    source_type,
    is_pending,
    notes,
    date,
    currency
  )
  VALUES (
    auth.uid(),
    p_account_id,
    p_amount,
    p_merchant_raw,
    p_category_id,
    COALESCE(p_source_type, 'manual'),
    COALESCE(p_is_pending, FALSE),
    p_notes,
    COALESCE(p_date, NOW()),
    account_row.currency
  )
  RETURNING * INTO new_transaction;

  UPDATE public.accounts
  SET balance = balance + p_amount,
      last_updated = NOW()
  WHERE id = p_account_id;

  RETURN new_transaction;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_bill_paid(
  p_bill_id UUID,
  p_next_due_date DATE,
  p_notes TEXT DEFAULT 'Auto-paid from Bills Dashboard'
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  bill_row public.bills%ROWTYPE;
  account_row public.accounts%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO bill_row
  FROM public.bills
  WHERE id = p_bill_id
    AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill not found';
  END IF;

  UPDATE public.bills
  SET next_due_date = p_next_due_date,
      is_paid_this_cycle = TRUE
  WHERE id = p_bill_id;

  IF bill_row.account_id IS NULL THEN
    RETURN;
  END IF;

  SELECT *
  INTO account_row
  FROM public.accounts
  WHERE id = bill_row.account_id
    AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Linked account not found';
  END IF;

  INSERT INTO public.transactions (
    user_id,
    account_id,
    amount,
    merchant_raw,
    source_type,
    is_pending,
    notes,
    currency
  )
  VALUES (
    auth.uid(),
    bill_row.account_id,
    -ABS(bill_row.amount),
    bill_row.name,
    'manual',
    FALSE,
    p_notes,
    account_row.currency
  );

  UPDATE public.accounts
  SET balance = balance - ABS(bill_row.amount),
      last_updated = NOW()
  WHERE id = bill_row.account_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_savings_contribution(
  p_goal_id UUID,
  p_account_id UUID,
  p_amount NUMERIC,
  p_notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  goal_row public.savings_goals%ROWTYPE;
  account_row public.accounts%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO goal_row
  FROM public.savings_goals
  WHERE id = p_goal_id
    AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Savings goal not found';
  END IF;

  SELECT *
  INTO account_row
  FROM public.accounts
  WHERE id = p_account_id
    AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Funding account not found';
  END IF;

  INSERT INTO public.savings_contributions (
    goal_id,
    user_id,
    amount,
    notes
  )
  VALUES (
    p_goal_id,
    auth.uid(),
    p_amount,
    p_notes
  );

  UPDATE public.savings_goals
  SET current_amount = current_amount + p_amount,
      is_completed = (current_amount + p_amount) >= target_amount
  WHERE id = p_goal_id;

  INSERT INTO public.transactions (
    user_id,
    account_id,
    amount,
    merchant_raw,
    source_type,
    is_pending,
    notes,
    currency
  )
  VALUES (
    auth.uid(),
    p_account_id,
    -ABS(p_amount),
    CONCAT('Transfer to ', goal_row.name),
    'manual',
    FALSE,
    COALESCE(p_notes, CONCAT('Savings contribution to ', goal_row.name)),
    account_row.currency
  );

  UPDATE public.accounts
  SET balance = balance - ABS(p_amount),
      last_updated = NOW()
  WHERE id = p_account_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_manual_transaction(UUID, NUMERIC, TEXT, UUID, BOOLEAN, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_bill_paid(UUID, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_savings_contribution(UUID, UUID, NUMERIC, TEXT) TO authenticated;
