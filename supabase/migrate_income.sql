-- Add income_ngn to existing projects (run in Supabase SQL Editor once).
alter table public.monthly_budgets
  add column if not exists income_ngn bigint not null default 0
  check (income_ngn >= 0);
