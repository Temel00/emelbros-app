-- Platform tables: profiles, allowed_emails, pins (module registry).
-- Single `public` schema, unprefixed platform tables (ADR-0006).
-- RLS templates per ADR-0007; allowed_emails is deny-all per ADR-0010.

-- === profiles ===================================================
-- One row per member, keyed to the Supabase auth user id. Row creation is
-- owned by the auth sign-up flow (next ticket, ADR-0011) — this migration
-- only creates the table and its policies.

create type public.accent as enum ('pink', 'yellow', 'green', 'blue');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  accent public.accent not null default 'pink',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Family: every signed-in member can see every profile (avatars, member
-- directory, identity surfaces per #18 are shown platform-wide).
create policy "profiles_select_family" on public.profiles
  for select
  using (auth.uid() is not null);

-- A member manages only their own row.
create policy "profiles_insert_own" on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- === allowed_emails ==============================================
-- Backs the "Before User Created" auth hook (next ticket). Deny-all RLS:
-- the hook runs `security definer` and bypasses RLS; nothing else reads
-- this table (ADR-0010).

create table public.allowed_emails (
  email text primary key,
  label text not null,
  created_at timestamptz not null default now()
);

alter table public.allowed_emails enable row level security;
-- No policies granted to `anon` or `authenticated` — deny-all by omission.

-- Seed the five family emails. These are local-dev placeholders; the owner
-- manages the real list via the Supabase dashboard in every other
-- environment (ADR-0010) and must replace these before go-live.
insert into public.allowed_emails (email, label) values
  ('temelaudio@gmail.com', 'Owner'),
  ('member2@example.com', 'Member 2 (placeholder — replace via dashboard)'),
  ('member3@example.com', 'Member 3 (placeholder — replace via dashboard)'),
  ('member4@example.com', 'Member 4 (placeholder — replace via dashboard)'),
  ('member5@example.com', 'Member 5 (placeholder — replace via dashboard)');

-- === pins (module registry) ======================================
-- Pinning is visibility-only (ADR-0002): (member, module, widget?, position)
-- rows only, no catalog. A member reads and writes only their own rows.

create table public.pins (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users (id) on delete cascade,
  module text not null,
  widget text,
  position integer not null,
  created_at timestamptz not null default now()
);

-- One pin per (member, module) launcher tile, and one per (member, module,
-- widget) — partial indexes since a plain unique constraint treats every
-- null `widget` as distinct.
create unique index pins_module_unique_idx
  on public.pins (member_id, module)
  where widget is null;

create unique index pins_widget_unique_idx
  on public.pins (member_id, module, widget)
  where widget is not null;

alter table public.pins enable row level security;

create policy "pins_select_own" on public.pins
  for select
  using (auth.uid() = member_id);

create policy "pins_insert_own" on public.pins
  for insert
  with check (auth.uid() = member_id);

create policy "pins_update_own" on public.pins
  for update
  using (auth.uid() = member_id)
  with check (auth.uid() = member_id);

create policy "pins_delete_own" on public.pins
  for delete
  using (auth.uid() = member_id);
