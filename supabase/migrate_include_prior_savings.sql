-- Option to exclude last month's unused budget from this month's net.
-- Run in Supabase SQL Editor once.

alter table public.monthly_budgets
  add column if not exists include_prior_savings boolean not null default true;
