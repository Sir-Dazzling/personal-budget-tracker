-- Starting balance + income ledger (run in Supabase SQL Editor once).

alter table public.monthly_budgets
  add column if not exists starting_balance_ngn bigint not null default 0
  check (starting_balance_ngn >= 0);

create table if not exists public.incomes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  amount_ngn bigint not null check (amount_ngn > 0),
  note text not null default '',
  received_on date not null default (timezone('Africa/Lagos', now()))::date,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists incomes_household_month_idx
  on public.incomes (household_id, received_on);

alter table public.incomes enable row level security;

drop policy if exists "Incomes: household CRUD" on public.incomes;
create policy "Incomes: household CRUD" on public.incomes
  for all using (household_id in (select public.user_household_ids()))
  with check (household_id in (select public.user_household_ids()));
