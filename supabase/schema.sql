-- Split: Combined Naira Budget Tracker
-- Run this in the Supabase SQL Editor for a new project.

create extension if not exists "pgcrypto";

-- Profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

-- Households
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our budget',
  join_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

-- Members of a household
create table public.members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  color text not null default '#0d4f3c',
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create index members_user_id_idx on public.members (user_id);
create index members_household_id_idx on public.members (household_id);

-- Monthly budgets (amount_ngn = expected expenses; income_ngn = income received)
create table public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  year_month text not null, -- YYYY-MM
  amount_ngn bigint not null check (amount_ngn >= 0),
  income_ngn bigint not null default 0 check (income_ngn >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, year_month)
);

-- Expenses
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  amount_ngn bigint not null check (amount_ngn > 0),
  category text not null,
  note text not null default '',
  spent_by uuid not null references public.members (id) on delete restrict,
  spent_on date not null default (timezone('Africa/Lagos', now()))::date,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index expenses_household_month_idx on public.expenses (household_id, spent_on);

-- Helper: households the current user belongs to
create or replace function public.user_household_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.members where user_id = auth.uid();
$$;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Member')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.members enable row level security;
alter table public.monthly_budgets enable row level security;
alter table public.expenses enable row level security;

create policy "Profiles: read own" on public.profiles
  for select using (id = auth.uid());
create policy "Profiles: update own" on public.profiles
  for update using (id = auth.uid());

create policy "Households: members can read" on public.households
  for select using (id in (select public.user_household_ids()));
create policy "Households: authenticated can create" on public.households
  for insert with check (auth.uid() = created_by);
create policy "Households: members can update" on public.households
  for update using (id in (select public.user_household_ids()));

create policy "Members: household can read" on public.members
  for select using (household_id in (select public.user_household_ids()));
create policy "Members: insert self into household" on public.members
  for insert with check (user_id = auth.uid());
create policy "Members: update own row" on public.members
  for update using (user_id = auth.uid());

-- Allow joining by code: need to read household by join_code before membership
create policy "Households: read by join code for join" on public.households
  for select using (true);

create policy "Budgets: household CRUD" on public.monthly_budgets
  for all using (household_id in (select public.user_household_ids()))
  with check (household_id in (select public.user_household_ids()));

create policy "Expenses: household CRUD" on public.expenses
  for all using (household_id in (select public.user_household_ids()))
  with check (household_id in (select public.user_household_ids()));

-- Join household by code (RPC)
create or replace function public.join_household(p_code text, p_display_name text, p_color text default '#1a6b52')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  mid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select id into hid from public.households where join_code = upper(trim(p_code));
  if hid is null then
    raise exception 'Invalid join code';
  end if;

  if exists (select 1 from public.members where household_id = hid and user_id = auth.uid()) then
    select id into mid from public.members where household_id = hid and user_id = auth.uid();
    return mid;
  end if;

  if (select count(*) from public.members where household_id = hid) >= 2 then
    raise exception 'This household already has two members';
  end if;

  insert into public.members (household_id, user_id, display_name, color)
  values (hid, auth.uid(), p_display_name, p_color)
  returning id into mid;

  return mid;
end;
$$;

create or replace function public.create_household(p_name text, p_display_name text, p_color text default '#0d4f3c')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.members where user_id = auth.uid()) then
    raise exception 'You already belong to a household';
  end if;

  insert into public.households (name, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'Our budget'), auth.uid())
  returning id into hid;

  insert into public.members (household_id, user_id, display_name, color)
  values (hid, auth.uid(), p_display_name, p_color);

  return hid;
end;
$$;

grant execute on function public.join_household(text, text, text) to authenticated;
grant execute on function public.create_household(text, text, text) to authenticated;
grant execute on function public.user_household_ids() to authenticated;
