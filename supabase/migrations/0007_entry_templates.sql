-- ============================================================================
-- Daily Tracker — entry templates (one-tap logging of routine work).
-- A per-user set of presets; owner-only via RLS. Reuses the entry_category /
-- entry_status enums from 0001.
--
-- Run in the Supabase SQL editor.
-- ============================================================================

create table if not exists public.entry_templates (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  label         text not null,
  task          text not null default '',
  category      entry_category not null default 'other',
  minutes       integer not null default 0 check (minutes >= 0),
  ticket_number text,
  ticket_url    text,
  status        entry_status not null default 'progress',
  created_at    timestamptz not null default now()
);

create index if not exists entry_templates_user_idx
  on public.entry_templates (user_id);

alter table public.entry_templates enable row level security;

drop policy if exists "templates_select_own" on public.entry_templates;
create policy "templates_select_own" on public.entry_templates
  for select using (auth.uid() = user_id);

drop policy if exists "templates_insert_own" on public.entry_templates;
create policy "templates_insert_own" on public.entry_templates
  for insert with check (auth.uid() = user_id);

drop policy if exists "templates_update_own" on public.entry_templates;
create policy "templates_update_own" on public.entry_templates
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "templates_delete_own" on public.entry_templates;
create policy "templates_delete_own" on public.entry_templates
  for delete using (auth.uid() = user_id);
