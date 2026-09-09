-- Nutrition module, Phase 1a (#104): nutrition_food, nutrition_pantry_item.
-- Hand-written migration (ADR-0008), single `public` schema, slug-prefixed
-- tables (ADR-0006). Spec: docs/modules/nutrition.md §2, §4, §7.
--
-- Both tables are fixed **Family** scope (ADR-0004). Unlike darts_game,
-- they carry no `scope` column at all — there is nothing to store when the
-- answer is always Family and no caller ever filters or orders by it
-- (ADR-0007's general fixed-policy guidance). The manifest still declares
-- the policy informationally.
--
-- `public.set_updated_at()` is not created here — it's the shared trigger
-- function first added by 20260717042825_habits_tables.sql.

-- === nutrition_food ==================================================
-- The shared dictionary every other stage points at (§1, §3.1). Nutrition
-- facts are expressed per one `unit` (e.g. per `g`, per `each`), which is
-- the basis both pantry quantities and, later, recipe/log math use.
--
-- The macro columns are required (§4 marks only fiber optional): a food's
-- nutrition facts are the reason the dictionary exists, and Phase 3's log
-- snapshots them. `barcode` is unique when present — Postgres treats nulls
-- as distinct, so a plain unique constraint already means "at most one row
-- per real barcode" without blocking the many foods that have none.
--
-- `created_by` is provenance only, not ownership: the dictionary is a
-- shared household resource, so it survives the member who added an entry
-- (`on delete set null`) rather than cascading entries away with them.

create table public.nutrition_food (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  barcode text,
  unit text not null,
  calories_per_unit numeric not null,
  protein_g_per_unit numeric not null,
  carbs_g_per_unit numeric not null,
  fat_g_per_unit numeric not null,
  fiber_g_per_unit numeric,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nutrition_food_name_not_blank check (btrim(name) <> ''),
  constraint nutrition_food_unit_not_blank check (btrim(unit) <> ''),
  constraint nutrition_food_barcode_unique unique (barcode),
  constraint nutrition_food_macros_non_negative check (
    calories_per_unit >= 0
    and protein_g_per_unit >= 0
    and carbs_g_per_unit >= 0
    and fat_g_per_unit >= 0
    and (fiber_g_per_unit is null or fiber_g_per_unit >= 0)
  )
);

create trigger nutrition_food_set_updated_at
  before update on public.nutrition_food
  for each row execute function public.set_updated_at();

-- === nutrition_pantry_item ===========================================
-- One line of household inventory (§1, §3.2). `location` holds a key from
-- the code-side registry (`fridge`/`freezer`/`pantry`/`other`) — no check
-- constraint, deliberately: registries are additive and forgiving, and
-- adding a location must stay a code change rather than a migration (§10),
-- exactly as lists_list.kind is stored.
--
-- `unit` is denormalised onto the row rather than read from the food: v1
-- does no unit conversion (§8), and a pantry line records the unit it was
-- counted in. `added_by` is the last member to touch the row (§4) — again
-- provenance, not ownership; anyone may edit or delete any line (§2).

create table public.nutrition_pantry_item (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.nutrition_food (id) on delete cascade,
  quantity numeric not null,
  unit text not null,
  location text not null,
  expires_on date,
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nutrition_pantry_item_quantity_non_negative check (quantity >= 0),
  constraint nutrition_pantry_item_unit_not_blank check (btrim(unit) <> ''),
  constraint nutrition_pantry_item_location_not_blank check (btrim(location) <> '')
);

create index nutrition_pantry_item_food_id_idx
  on public.nutrition_pantry_item (food_id);

create trigger nutrition_pantry_item_set_updated_at
  before update on public.nutrition_pantry_item
  for each row execute function public.set_updated_at();

-- === RLS =============================================================
-- Fixed-Family template (ADR-0004/0007, nutrition.md §2, §10): the kitchen
-- is one shared thing. Any signed-in member reads and writes every row —
-- no owner clause, matching darts_game's SELECT rather than its
-- owner-scoped writes, because a pantry line isn't owned by whoever
-- happened to unpack the groceries. Signed out, neither table exists.

alter table public.nutrition_food enable row level security;

create policy "nutrition_food_select_family" on public.nutrition_food
  for select
  using (auth.uid() is not null);

create policy "nutrition_food_insert_family" on public.nutrition_food
  for insert
  with check (auth.uid() is not null);

create policy "nutrition_food_update_family" on public.nutrition_food
  for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "nutrition_food_delete_family" on public.nutrition_food
  for delete
  using (auth.uid() is not null);

alter table public.nutrition_pantry_item enable row level security;

create policy "nutrition_pantry_item_select_family" on public.nutrition_pantry_item
  for select
  using (auth.uid() is not null);

create policy "nutrition_pantry_item_insert_family" on public.nutrition_pantry_item
  for insert
  with check (auth.uid() is not null);

create policy "nutrition_pantry_item_update_family" on public.nutrition_pantry_item
  for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "nutrition_pantry_item_delete_family" on public.nutrition_pantry_item
  for delete
  using (auth.uid() is not null);
