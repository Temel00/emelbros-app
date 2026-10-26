-- Coffee module: coffee_bean, coffee_grind_profile.
-- Hand-written migration (ADR-0008), single `public` schema, slug-prefixed
-- tables (ADR-0006). Fixed Family scope (ADR-0004/0007): no scope column, no
-- participants table, no owner column — any signed-in member reads and writes.
-- Reuses public.set_updated_at() from the habits migration.

-- === coffee_bean =====================================================
-- `photo_path` is an opaque Storage path; the bucket and serving come later.

create table public.coffee_bean (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  roaster text,
  origin text,
  notes text,
  roast_level text,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coffee_bean_name_check check (btrim(name) <> ''),
  constraint coffee_bean_roast_level_check check (
    roast_level in ('light', 'medium-light', 'medium', 'medium-dark', 'dark')
  )
);

create trigger coffee_bean_set_updated_at
  before update on public.coffee_bean
  for each row execute function public.set_updated_at();

-- === coffee_grind_profile ============================================
-- No uniqueness on (bean_id, label): duplicate labels are allowed.

create table public.coffee_grind_profile (
  id uuid primary key default gen_random_uuid(),
  bean_id uuid not null references public.coffee_bean (id) on delete cascade,
  label text not null,
  description text,
  grind_size numeric(4, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coffee_grind_profile_label_check check (btrim(label) <> ''),
  constraint coffee_grind_profile_grind_size_check check (
    grind_size between 0 and 99.99
  )
);

create index coffee_grind_profile_bean_id_idx on public.coffee_grind_profile (bean_id);

create trigger coffee_grind_profile_set_updated_at
  before update on public.coffee_grind_profile
  for each row execute function public.set_updated_at();

-- === RLS ==============================================================
-- Fixed Family template: auth.uid() is not null on all four verbs.

alter table public.coffee_bean enable row level security;

create policy "coffee_bean_select_family" on public.coffee_bean
  for select
  using (auth.uid() is not null);

create policy "coffee_bean_insert_family" on public.coffee_bean
  for insert
  with check (auth.uid() is not null);

create policy "coffee_bean_update_family" on public.coffee_bean
  for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "coffee_bean_delete_family" on public.coffee_bean
  for delete
  using (auth.uid() is not null);

alter table public.coffee_grind_profile enable row level security;

create policy "coffee_grind_profile_select_family" on public.coffee_grind_profile
  for select
  using (auth.uid() is not null);

create policy "coffee_grind_profile_insert_family" on public.coffee_grind_profile
  for insert
  with check (auth.uid() is not null);

create policy "coffee_grind_profile_update_family" on public.coffee_grind_profile
  for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "coffee_grind_profile_delete_family" on public.coffee_grind_profile
  for delete
  using (auth.uid() is not null);

-- === example data =====================================================
-- Seeded here because there is no dev DB and seed.sql never runs. Invented
-- beans, no photos. `30/15` = 30 s for a 15 ml shot. Drip sits at 10-13,
-- espresso at 3-8.

insert into public.coffee_bean (id, name, roaster, origin, notes, roast_level)
values
  (
    'c0ffee00-0000-4000-8000-00000000000a',
    'Morning Lantern',
    'Harbor Light Roasters',
    'Huila, Colombia',
    'Caramel, toasted hazelnut and a soft cocoa finish.',
    'medium'
  ),
  (
    'c0ffee00-0000-4000-8000-00000000000b',
    'Fieldstone Reserve',
    'Birchwood Coffee Co.',
    'Yirgacheffe, Ethiopia',
    'Bright and floral, with blueberry and lemon zest.',
    'light'
  );

insert into public.coffee_grind_profile (bean_id, label, description, grind_size)
values
  ('c0ffee00-0000-4000-8000-00000000000a', 'Drip', 'Nutty and balanced, a gentle sweetness.', 11.50),
  ('c0ffee00-0000-4000-8000-00000000000a', 'Espresso 30/30', 'Syrupy, chocolatey, low acidity.', 5.50),
  ('c0ffee00-0000-4000-8000-00000000000b', 'Drip', 'Clean and tea-like, floral top notes.', 12.00),
  ('c0ffee00-0000-4000-8000-00000000000b', 'Espresso 30/15', 'Short and intense, sharp berry acidity.', 6.00),
  ('c0ffee00-0000-4000-8000-00000000000b', 'Espresso 30/30', 'Rounder and sweeter, lemon candy finish.', 4.00);
