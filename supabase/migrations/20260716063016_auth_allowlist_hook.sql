-- Before User Created auth hook (allowlist enforcement) and the
-- profiles-provisioning trigger it composes with (ADR-0010, ADR-0011,
-- docs/research/supabase-auth-google-allowlist.md).

-- === before_user_created_hook ====================================
-- Rejects signup for any email not present in public.allowed_emails.
-- Runs pre-insert into auth.users, so a rejected sign-in leaves no trace.
-- security definer + table ownership lets it read the deny-all
-- allowed_emails table (ADR-0010) without any RLS policy granted to
-- authenticated/anon.

create or replace function public.before_user_created_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  incoming_email text;
  is_allowed boolean;
begin
  incoming_email := event->'user'->>'email';

  select exists (
    select 1 from public.allowed_emails where email = incoming_email
  ) into is_allowed;

  if not is_allowed then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'This account is not authorized to sign in.',
        'http_code', 403
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;

revoke execute on function public.before_user_created_hook from authenticated, anon, public;
grant execute on function public.before_user_created_hook to supabase_auth_admin;

-- === handle_new_member (profiles provisioning) ===================
-- Populates public.profiles for every allowlisted member the instant
-- auth.users gains a row — the hook above guarantees that's only ever
-- the 5 family members. security definer: the trigger executes as
-- supabase_auth_admin, which lacks INSERT on public.profiles otherwise.

create or replace function public.handle_new_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_member();
