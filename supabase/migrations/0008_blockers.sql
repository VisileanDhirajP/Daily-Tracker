-- ============================================================================
-- Daily Tracker — blockers (trackable impediments), owner-scoped with
-- read-only manager/admin access. Mirrors entries (0001) + manager RLS (0003).
-- Run in the Supabase SQL editor (or `supabase db push`). Idempotent.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'blocker_status') then
    create type blocker_status as enum ('open', 'resolved');
  end if;
end$$;

create table if not exists public.blockers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  reason        text not null,
  waiting_on    text,
  ticket_number text,
  ticket_url    text,
  status        blocker_status not null default 'open',
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,
  updated_at    timestamptz not null default now()
);

create index if not exists blockers_user_status_idx
  on public.blockers (user_id, status, created_at desc);

-- Reuse the shared updated_at trigger fn defined in 0001.
drop trigger if exists blockers_set_updated_at on public.blockers;
create trigger blockers_set_updated_at
  before update on public.blockers
  for each row execute function public.set_updated_at();

alter table public.blockers enable row level security;

-- Owner: full CRUD.
drop policy if exists "blockers_select_own" on public.blockers;
create policy "blockers_select_own" on public.blockers
  for select using (auth.uid() = user_id);
drop policy if exists "blockers_insert_own" on public.blockers;
create policy "blockers_insert_own" on public.blockers
  for insert with check (auth.uid() = user_id);
drop policy if exists "blockers_update_own" on public.blockers;
create policy "blockers_update_own" on public.blockers
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "blockers_delete_own" on public.blockers;
create policy "blockers_delete_own" on public.blockers
  for delete using (auth.uid() = user_id);

-- Manager: SELECT their team's blockers (read-only). Mirrors entries_select_team.
drop policy if exists "blockers_select_team" on public.blockers;
create policy "blockers_select_team" on public.blockers
  for select using (
    public.current_user_role() in ('manager', 'admin')
    and exists (
      select 1 from public.profiles emp
      where emp.id = blockers.user_id
        and lower(auth.jwt() ->> 'email') = any (
          select lower(e) from unnest(emp.manager_emails) as e
        )
    )
  );

-- Admin: SELECT all.
drop policy if exists "blockers_select_admin" on public.blockers;
create policy "blockers_select_admin" on public.blockers
  for select using (public.current_user_role() = 'admin');
