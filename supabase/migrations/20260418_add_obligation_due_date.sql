-- Add explicit obligation due date support for quick-complete timing flows.
ALTER TABLE public.obligations
  ADD COLUMN IF NOT EXISTS due_date DATE;
