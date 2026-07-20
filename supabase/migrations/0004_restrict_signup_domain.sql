-- ============================================================================
-- Daily Tracker — restrict sign-up to the company email domain.
-- Daily Tracker is an internal VisiLean tool: only @visilean.com addresses may
-- create an account. This is the authoritative gate (the signup form also
-- checks, but that's only UX — this trigger can't be bypassed by calling the
-- auth API directly). Keep the domain in sync with lib/auth/emailDomain.ts.
--
-- Run in the Supabase SQL editor.
-- ============================================================================

create or replace function public.enforce_company_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null
     or split_part(new.email, '@', 1) = ''
     or lower(split_part(new.email, '@', 2)) <> 'visilean.com' then
    raise exception
      'Daily Tracker is an internal VisiLean tool — only @visilean.com emails may sign up.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_company_email on auth.users;
create trigger enforce_company_email
  before insert on auth.users
  for each row execute function public.enforce_company_email();
