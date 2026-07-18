-- Local development seed (runs after migrations on every `supabase db reset`,
-- wired via [db.seed] in config.toml). Its job is to leave a freshly-reset
-- local database in a usable state instead of empty, so that:
--   1. the family allowlist is always present (also seeded by the platform
--      migration; re-affirmed here so a reset without that migration still
--      works), and
--   2. there is sample data to look at after signing in.
--
-- Seeding is LOCAL-DEV ONLY. It creates a dev auth user directly (bypassing
-- the Google OAuth + allowlist flow, which only runs for real sign-ins) so
-- that sample rows have an owner. This file is never run against production.
--
-- All inserts use fixed UUIDs and `on conflict do nothing`/`do update` so the
-- seed is idempotent and safe to re-run.

begin;

-- === allowlist ======================================================
-- Re-affirm the five family emails (idempotent; the platform migration
-- already seeds these on a normal reset).
insert into public.allowed_emails (email, label) values
  ('temelaudio@gmail.com', 'Owner'),
  ('member2@example.com', 'Member 2 (placeholder — replace via dashboard)'),
  ('member3@example.com', 'Member 3 (placeholder — replace via dashboard)'),
  ('member4@example.com', 'Member 4 (placeholder — replace via dashboard)'),
  ('member5@example.com', 'Member 5 (placeholder — replace via dashboard)')
on conflict (email) do nothing;

-- === dev auth user ==================================================
-- A stand-in owner for the sample data below. Uses a distinct
-- `@emelbros.local` email (NOT a real family Google address) so it can never
-- collide with a real Google sign-in. Inserting the row fires
-- handle_new_member(), which provisions the matching public.profiles row.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'dev-seed@emelbros.local',
  '',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) on conflict (id) do nothing;

-- Ensure the profile exists even if the trigger path ever changes, and give
-- the dev user a recognisable accent.
insert into public.profiles (id, accent)
values ('11111111-1111-1111-1111-111111111111', 'green')
on conflict (id) do update set accent = excluded.accent;

-- === sample lists (family scope) ====================================
-- Family scope so EVERY signed-in member sees them after a reset —
-- getVisibleLists() relies on RLS and does not filter by owner, so these
-- show up on the /lists page for whoever is signed in (read-only to a
-- non-owner: list/item writes are owner-only per lists.md §2).
insert into public.lists_list (id, owner_member_id, title, kind, scope) values
  ('22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111111', 'Groceries', 'checklist', 'family'),
  ('22222222-2222-2222-2222-222222222002', '11111111-1111-1111-1111-111111111111', 'Camping trip', 'checklist', 'family')
on conflict (id) do nothing;

insert into public.lists_item (id, list_id, text, checked, position) values
  ('22222222-2222-2222-2222-2222220a0001', '22222222-2222-2222-2222-222222222001', 'Milk', false, 0),
  ('22222222-2222-2222-2222-2222220a0002', '22222222-2222-2222-2222-222222222001', 'Eggs', false, 1),
  ('22222222-2222-2222-2222-2222220a0003', '22222222-2222-2222-2222-222222222001', 'Bread', false, 2),
  ('22222222-2222-2222-2222-2222220a0004', '22222222-2222-2222-2222-222222222001', 'Coffee', true, 3),
  ('22222222-2222-2222-2222-2222220b0001', '22222222-2222-2222-2222-222222222002', 'Tent', false, 0),
  ('22222222-2222-2222-2222-2222220b0002', '22222222-2222-2222-2222-222222222002', 'Sleeping bags', false, 1),
  ('22222222-2222-2222-2222-2222220b0003', '22222222-2222-2222-2222-222222222002', 'Cooler', false, 2),
  ('22222222-2222-2222-2222-2222220b0004', '22222222-2222-2222-2222-222222222002', 'Flashlight', true, 3)
on conflict (id) do nothing;

-- === sample habits (owned by the dev user) ==========================
-- NOTE: unlike lists, the habits page (getTrackables) filters strictly to
-- `owner_member_id = <you>` — "Your habits" is owner-scoped by design. So
-- these rows will NOT appear on a real member's /habits page; they exist to
-- prime the DB and are visible in Supabase Studio (and to the dev user).
insert into public.habits_trackable
  (id, owner_member_id, title, kind, scope, cadence_type, cadence_target, cadence_weekdays) values
  ('33333333-3333-3333-3333-333333333001', '11111111-1111-1111-1111-111111111111', 'Floss', 'habit', 'family', 'daily', null, null),
  ('33333333-3333-3333-3333-333333333002', '11111111-1111-1111-1111-111111111111', 'Weight', 'weight', 'private', null, null, null),
  ('33333333-3333-3333-3333-333333333003', '11111111-1111-1111-1111-111111111111', 'Exercise', 'exercise', 'family', null, null, null)
on conflict (id) do nothing;

-- Floss: a short daily streak ending today.
insert into public.habits_log (trackable_id, log_date, done) values
  ('33333333-3333-3333-3333-333333333001', current_date - 2, true),
  ('33333333-3333-3333-3333-333333333001', current_date - 1, true),
  ('33333333-3333-3333-3333-333333333001', current_date, true)
on conflict (trackable_id, log_date) do nothing;

-- Weight: a few numeric data points (kg).
insert into public.habits_log (trackable_id, log_date, done, value) values
  ('33333333-3333-3333-3333-333333333002', current_date - 6, false, 82.4),
  ('33333333-3333-3333-3333-333333333002', current_date - 3, false, 82.0),
  ('33333333-3333-3333-3333-333333333002', current_date, false, 81.6)
on conflict (trackable_id, log_date) do nothing;

-- Exercise: minutes logged on a couple of days.
insert into public.habits_log (trackable_id, log_date, done, value) values
  ('33333333-3333-3333-3333-333333333003', current_date - 1, false, 30),
  ('33333333-3333-3333-3333-333333333003', current_date, false, 45)
on conflict (trackable_id, log_date) do nothing;

commit;
