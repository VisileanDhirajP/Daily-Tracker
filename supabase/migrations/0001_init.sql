-- ============================================================================
-- Daily Tracker — initial schema, enums, indexes, RLS, triggers.
-- Run in the Supabase SQL editor (or `supabase db push`) for supabase mode.
-- ============================================================================

-- --- Enums ------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'entry_category') then
    create type entry_category as enum
      ('dev', 'meeting', 'review', 'docs', 'support', 'planning', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'entry_status') then
    create type entry_status as enum ('done', 'progress');
  end if;
end$$;

-- --- profiles (1:1 with auth.users) -----------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text not null default '',
  manager_email text,
  created_at    timestamptz not null default now()
);

-- --- entries ----------------------------------------------------------------
create table if not exists public.entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  entry_date    date not null,
  task          text not null,
  category      entry_category not null default 'other',
  ticket_number text,
  ticket_url    text,
  minutes       integer not null default 0 check (minutes >= 0),
  status        entry_status not null default 'progress',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists entries_user_id_idx on public.entries (user_id);
create index if not exists entries_user_date_idx
  on public.entries (user_id, entry_date desc);

-- --- updated_at trigger -----------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists entries_set_updated_at on public.entries;
create trigger entries_set_updated_at
  before update on public.entries
  for each row execute function public.set_updated_at();

-- --- Auto-create a profile row when a new auth user signs up ----------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.entries  enable row level security;

-- profiles: a user can read/update only their own row.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- entries: full CRUD scoped to the owner.
drop policy if exists "entries_select_own" on public.entries;
create policy "entries_select_own" on public.entries
  for select using (auth.uid() = user_id);

drop policy if exists "entries_insert_own" on public.entries;
create policy "entries_insert_own" on public.entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "entries_update_own" on public.entries;
create policy "entries_update_own" on public.entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "entries_delete_own" on public.entries;
create policy "entries_delete_own" on public.entries
  for delete using (auth.uid() = user_id);
