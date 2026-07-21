-- ============================================================================
-- Daily Tracker — harden the email + privilege guards (defense-in-depth).
--   1. enforce_company_email: require exactly one '@' and check the domain
--      after it (so 'x@visilean.com@evil.com' no longer slips through
--      split_part(...,2)).
--   2. guard_privileged_profile_fields: fail CLOSED on a null role, and also
--      cover INSERT (a profile-less user can't insert themselves as admin /
--      pre-assign managers).
--   3. Prevent removing the LAST admin (avoids locking everyone out of /admin).
--
-- Run in the Supabase SQL editor. Idempotent.
-- ============================================================================

-- 1. Stricter company-email check ------------------------------------------
create or replace function public.enforce_company_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null
     or (length(new.email) - length(replace(new.email, '@', ''))) <> 1
     or lower(split_part(new.email, '@', 2)) <> 'visilean.com' then
    raise exception
      'Daily Tracker is an internal VisiLean tool — only @visilean.com emails may sign up.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- 2 + 3. Privilege guard: fail closed, cover INSERT + UPDATE, protect last admin
create or replace function public.guard_privileged_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text := coalesce(public.current_user_role(), 'user');
begin
  if caller_role <> 'admin' then
    if tg_op = 'INSERT' then
      if new.role is distinct from 'user' then
        raise exception 'only admins can set a user role';
      end if;
      if coalesce(array_length(new.manager_emails, 1), 0) <> 0 then
        raise exception 'only admins can assign managers';
      end if;
    else
      if new.role is distinct from old.role then
        raise exception 'only admins can change a user role';
      end if;
      if new.manager_emails is distinct from old.manager_emails then
        raise exception 'only admins can assign managers';
      end if;
    end if;
  end if;

  -- Never let the final admin be demoted (applies to admins too).
  if tg_op = 'UPDATE' and old.role = 'admin' and new.role <> 'admin' then
    if (select count(*) from public.profiles where role = 'admin') <= 1 then
      raise exception 'cannot remove the last admin';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged on public.profiles;
create trigger profiles_guard_privileged
  before insert or update on public.profiles
  for each row execute function public.guard_privileged_profile_fields();
