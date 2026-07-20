-- ============================================================================
-- Daily Tracker — roles + manager read-only team access.
--
-- Adds:
--   • profiles.role                — 'user' | 'manager' | 'admin' (default 'user')
--   • profiles.manager_emails      — text[] (replaces the single manager_email);
--                                    an employee can list MULTIPLE managers.
--   • current_user_role()          — SECURITY DEFINER helper (avoids RLS recursion)
--   • guard trigger                — only admins may change role / manager_emails
--   • RLS: managers read their TEAM (employees who list them); admins read ALL.
--
-- Run in the Supabase SQL editor (or `supabase db push`).
--
-- ⚠️  FIRST-ADMIN BOOTSTRAP (run ONCE, by hand, after this migration):
--     update public.profiles set role = 'admin'
--       where id = (select id from auth.users where email = 'you@example.com');
--     There is no admin yet to promote the first one, so this must be done in SQL.
--     Every role change after that is done in-app on the /admin page.
-- ============================================================================

-- --- role column ------------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'manager', 'admin'));

-- --- email on profiles ------------------------------------------------------
-- Denormalised from auth.users so a manager/admin can identify employees by
-- name+email without querying the (client-inaccessible) auth schema.
alter table public.profiles
  add column if not exists email text;

update public.profiles p
  set email = u.email
  from auth.users u
  where u.id = p.id and p.email is distinct from u.email;

-- Keep the signup trigger in sync: also stamp email on the new profile row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- --- manager_emails[] (multiple managers per employee) ----------------------
alter table public.profiles
  add column if not exists manager_emails text[] not null default '{}';

-- Migrate the existing single manager_email into the array, then retire it.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'manager_email'
  ) then
    update public.profiles
      set manager_emails = array[manager_email]
      where manager_email is not null and manager_email <> ''
        and coalesce(array_length(manager_emails, 1), 0) = 0;
    alter table public.profiles drop column manager_email;
  end if;
end$$;

-- --- Read the caller's own role WITHOUT triggering RLS recursion -------------
-- (A profiles policy that queried profiles directly would recurse; a SECURITY
--  DEFINER function reads the row with the definer's rights instead.)
create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- --- Lock privileged fields to admins ---------------------------------------
-- profiles_update_own (below) lets a user edit their own row (e.g. full_name),
-- but they must NOT be able to change their own role or reassign their managers.
-- RLS can't compare OLD/NEW, so a trigger enforces it: only admins may change
-- `role` or `manager_emails` (manager assignment is admin-driven).
create or replace function public.guard_privileged_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() <> 'admin' then
    if new.role is distinct from old.role then
      raise exception 'only admins can change a user role';
    end if;
    if new.manager_emails is distinct from old.manager_emails then
      raise exception 'only admins can assign managers';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
drop trigger if exists profiles_guard_privileged on public.profiles;
create trigger profiles_guard_privileged
  before update on public.profiles
  for each row execute function public.guard_privileged_profile_fields();

-- ============================================================================
-- RLS — managers/admins get SELECT-only on other people's rows (read-only).
-- The owner-scoped policies from 0001 remain unchanged.
-- ============================================================================

-- profiles: a manager can read their team (employees who list them), an admin
-- can read everyone.
drop policy if exists "profiles_select_team" on public.profiles;
create policy "profiles_select_team" on public.profiles
  for select using (
    public.current_user_role() in ('manager', 'admin')
    and lower(auth.jwt() ->> 'email') = any (
      select lower(e) from unnest(manager_emails) as e
    )
  );

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
  for select using (public.current_user_role() = 'admin');

-- admin can update any profile (used by the /admin role-assignment UI).
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- entries: a manager can read entries of their team; an admin can read all.
drop policy if exists "entries_select_team" on public.entries;
create policy "entries_select_team" on public.entries
  for select using (
    public.current_user_role() in ('manager', 'admin')
    and exists (
      select 1 from public.profiles emp
      where emp.id = entries.user_id
        and lower(auth.jwt() ->> 'email') = any (
          select lower(e) from unnest(emp.manager_emails) as e
        )
    )
  );

drop policy if exists "entries_select_admin" on public.entries;
create policy "entries_select_admin" on public.entries
  for select using (public.current_user_role() = 'admin');
