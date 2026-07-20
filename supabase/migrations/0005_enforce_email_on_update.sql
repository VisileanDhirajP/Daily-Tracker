-- ============================================================================
-- Daily Tracker — close the email-change gap in the @visilean.com restriction.
-- 0004 only guarded INSERT on auth.users, so a user could sign up with a
-- company email and then change it to a personal one via the auth API. This
-- extends the check to UPDATE, and keeps the denormalised profiles.email copy
-- in sync when an email legitimately changes.
--
-- Run in the Supabase SQL editor (reuses enforce_company_email() from 0004).
-- ============================================================================

-- Reject an email change that moves the account off the company domain.
drop trigger if exists enforce_company_email_update on auth.users;
create trigger enforce_company_email_update
  before update of email on auth.users
  for each row
  when (new.email is distinct from old.email)
  execute function public.enforce_company_email();

-- Keep profiles.email (used by manager/admin views) in sync after a change.
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists sync_profile_email on auth.users;
create trigger sync_profile_email
  after update of email on auth.users
  for each row
  when (new.email is distinct from old.email)
  execute function public.sync_profile_email();
