-- Nutrition managed pantry-field vocabularies (#155, map #146): the two
-- managed lists `nutrition_unit` and `nutrition_pantry_location`, plus the
-- foreign keys that turn every unit/location column into a constrained,
-- FK-enforced reference. Hand-written migration (ADR-0008), single `public`
-- schema, slug-prefixed tables (ADR-0006).
--
-- Governing decisions: ADR-0017 (two tables, FK-by-key, delete resets to a
-- protected default) and ADR-0016 (units typed by dimension, conversion
-- engine deferred). Provenance: decisions #147 / #148 / #150.
--
-- Deployment reality: this project has **no local/dev environment** — one
-- live Supabase DB, treated as a low-risk personal playground.
-- `supabase/seed.sql` / `config.toml [db.seed]` never run here, so all
-- seeding lives in THIS migration and is not mirrored into seed.sql.
--
-- Order matters: the data reconciliation (step 4) must precede the FK adds
-- (step 6), or the `RESTRICT`/`SET DEFAULT` FKs reject pre-existing rows and
-- the migration itself fails.

-- === 1. Tables =======================================================
-- Two separate tables rather than one generic kind-discriminated settings
-- table (ADR-0017): a unit carries a `dimension` and governs four columns
-- app-wide; a location carries an `icon` and belongs only to pantry items.
-- Both are global — the app is a single fixed-Family tenant (ADR-0004) with
-- no household entity — so, like every other nutrition table, they carry no
-- scope column.
--
-- `key` is the stable, immutable primary key referenced by the FKs; `active`
-- retires a row from pickers without disturbing rows already referencing it;
-- `protected` marks the seeded system default (`fridge` / `g`) that must
-- always exist so `ON DELETE SET DEFAULT` has a target — guarded below.

create table public.nutrition_pantry_location (
  key text primary key,
  label text not null,
  icon text not null,
  sort_order integer not null,
  active boolean not null default true,
  protected boolean not null default false,
  constraint nutrition_pantry_location_key_not_blank check (btrim(key) <> ''),
  constraint nutrition_pantry_location_label_not_blank check (btrim(label) <> ''),
  constraint nutrition_pantry_location_icon_not_blank check (btrim(icon) <> '')
);

create table public.nutrition_unit (
  key text primary key,
  label text not null,
  dimension text not null
    check (dimension in ('weight', 'volume', 'count')),
  sort_order integer not null,
  active boolean not null default true,
  protected boolean not null default false,
  constraint nutrition_unit_key_not_blank check (btrim(key) <> ''),
  constraint nutrition_unit_label_not_blank check (btrim(label) <> '')
);

-- Undeletable default guard: a protected row cannot be deleted, deactivated,
-- or un-protected (the last would be a trivial bypass to then delete it).
-- One shared function serves both tables — each references only columns
-- (`key`, `active`, `protected`) present on both.
create function public.nutrition_protect_default_vocab_row()
  returns trigger
  language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.protected then
      raise exception
        'Cannot delete protected default row "%" in %', old.key, tg_table_name
        using errcode = 'restrict_violation';
    end if;
    return old;
  end if;
  -- UPDATE
  if old.protected and (new.active = false or new.protected = false) then
    raise exception
      'Cannot deactivate or un-protect protected default row "%" in %',
      old.key, tg_table_name
      using errcode = 'restrict_violation';
  end if;
  return new;
end;
$$;

create trigger nutrition_pantry_location_protect_default
  before update or delete on public.nutrition_pantry_location
  for each row execute function public.nutrition_protect_default_vocab_row();

create trigger nutrition_unit_protect_default
  before update or delete on public.nutrition_unit
  for each row execute function public.nutrition_protect_default_vocab_row();

-- RLS: fixed-Family template (ADR-0004/0007), identical to every other
-- nutrition table — any signed-in member may add, rename, archive, or delete
-- a unit or location. Signed out, neither table exists.
alter table public.nutrition_pantry_location enable row level security;

create policy "nutrition_pantry_location_select_family" on public.nutrition_pantry_location
  for select
  using (auth.uid() is not null);

create policy "nutrition_pantry_location_insert_family" on public.nutrition_pantry_location
  for insert
  with check (auth.uid() is not null);

create policy "nutrition_pantry_location_update_family" on public.nutrition_pantry_location
  for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "nutrition_pantry_location_delete_family" on public.nutrition_pantry_location
  for delete
  using (auth.uid() is not null);

alter table public.nutrition_unit enable row level security;

create policy "nutrition_unit_select_family" on public.nutrition_unit
  for select
  using (auth.uid() is not null);

create policy "nutrition_unit_insert_family" on public.nutrition_unit
  for insert
  with check (auth.uid() is not null);

create policy "nutrition_unit_update_family" on public.nutrition_unit
  for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "nutrition_unit_delete_family" on public.nutrition_unit
  for delete
  using (auth.uid() is not null);

-- === 2. Seed the curated 12-unit vocabulary (ADR-0016) ===============
-- Tagged by dimension; `g` is the protected default. Idempotent so a re-run
-- (or a partially-applied migration) never duplicates.
insert into public.nutrition_unit (key, label, dimension, sort_order, active, protected)
values
  ('g',       'g',      'weight',  1, true, true),
  ('kg',      'kg',     'weight',  2, true, false),
  ('oz',      'oz',     'weight',  3, true, false),
  ('lb',      'lb',     'weight',  4, true, false),
  ('ml',      'ml',     'volume',  5, true, false),
  ('l',       'L',      'volume',  6, true, false),
  ('tsp',     'tsp',    'volume',  7, true, false),
  ('tbsp',    'tbsp',   'volume',  8, true, false),
  ('cup',     'cup',    'volume',  9, true, false),
  ('fl_oz',   'fl oz',  'volume', 10, true, false),
  ('each',    'each',   'count',  11, true, false),
  ('serving', 'serving','count',  12, true, false)
on conflict (key) do nothing;

-- === 3. Seed the 4-location vocabulary ===============================
-- Mirrors the retiring code registry (modules/nutrition/lib/locations.ts)
-- exactly so existing pantry rows map 1:1. `fridge` is the protected default;
-- icons are the same Lucide names location-icon.tsx already resolves.
insert into public.nutrition_pantry_location (key, label, icon, sort_order, active, protected)
values
  ('fridge',  'Fridge',  'Refrigerator', 1, true, true),
  ('freezer', 'Freezer', 'Snowflake',    2, true, false),
  ('pantry',  'Pantry',  'Archive',      3, true, false),
  ('other',   'Other',   'Package',      4, true, false)
on conflict (key) do nothing;

-- === 4. Reconcile existing data BEFORE the FKs =======================
-- Every referencing value must resolve to a seeded/inserted key, or the FK
-- adds in step 6 fail. On a single live DB these sets are likely tiny or
-- empty, but the migration must hold regardless.

-- 4a. Pantry locations: strays (old forgiving `fallbackLocation` keys) → the
-- 'other' bucket.
update public.nutrition_pantry_item
set location = 'other'
where location not in (select key from public.nutrition_pantry_location);

-- 4b. `nutrition_food.unit` gets a RESTRICT FK — the base unit a food's
-- macros are stated per, which must never be lost. Normalize common
-- case/synonyms to seeded keys first...
update public.nutrition_food
set unit = case lower(btrim(unit))
  when 'g' then 'g' when 'gram' then 'g' when 'grams' then 'g'
    when 'gm' then 'g' when 'gms' then 'g'
  when 'kg' then 'kg' when 'kgs' then 'kg'
    when 'kilogram' then 'kg' when 'kilograms' then 'kg'
  when 'oz' then 'oz' when 'ounce' then 'oz' when 'ounces' then 'oz'
  when 'lb' then 'lb' when 'lbs' then 'lb'
    when 'pound' then 'lb' when 'pounds' then 'lb'
  when 'ml' then 'ml' when 'milliliter' then 'ml' when 'millilitre' then 'ml'
    when 'milliliters' then 'ml' when 'millilitres' then 'ml'
  when 'l' then 'l' when 'liter' then 'l' when 'litre' then 'l'
    when 'liters' then 'l' when 'litres' then 'l'
  when 'tsp' then 'tsp' when 'teaspoon' then 'tsp' when 'teaspoons' then 'tsp'
  when 'tbsp' then 'tbsp' when 'tbs' then 'tbsp'
    when 'tablespoon' then 'tbsp' when 'tablespoons' then 'tbsp'
  when 'cup' then 'cup' when 'cups' then 'cup'
  when 'fl oz' then 'fl_oz' when 'fl_oz' then 'fl_oz' when 'floz' then 'fl_oz'
    when 'fluid ounce' then 'fl_oz' when 'fluid ounces' then 'fl_oz'
  when 'each' then 'each' when 'ea' then 'each'
    when 'unit' then 'each' when 'units' then 'each'
    when 'count' then 'each' when 'ct' then 'each'
    when 'piece' then 'each' when 'pieces' then 'each'
    when 'pc' then 'each' when 'pcs' then 'each'
  when 'serving' then 'serving' when 'servings' then 'serving'
    when 'srv' then 'serving'
  else unit
end
where unit is not null;

-- ...then adopt any still-unmatched distinct value verbatim as an active
-- unit (dimension defaulted to 'count') so no food is orphaned and the
-- RESTRICT FK holds. sort_order 900 parks them after the curated list.
insert into public.nutrition_unit (key, label, dimension, sort_order, active, protected)
select
  f.unit,
  f.unit,
  'count',
  900,
  true,
  false
from (select distinct unit from public.nutrition_food where unit is not null) f
where f.unit not in (select key from public.nutrition_unit)
on conflict (key) do nothing;

-- 4c. `nutrition_pantry_item.unit` (NOT NULL) → its food's base unit via
-- join. Per #147 the old freeform placeholder is dropped: the food's base
-- unit is more meaningful than a blanket 'g', and every pantry row has a
-- food (food_id NOT NULL) whose unit is now a guaranteed-valid key.
update public.nutrition_pantry_item p
set unit = f.unit
from public.nutrition_food f
where f.id = p.food_id;

-- 4d. `nutrition_recipe_ingredient.unit` / `nutrition_shopping_list_item.unit`
-- (both nullable): keep where the string already matches a seeded key, else
-- drop to NULL — these carry no macro basis, so a reset is harmless.
update public.nutrition_recipe_ingredient
set unit = null
where unit is not null
  and unit not in (select key from public.nutrition_unit);

update public.nutrition_shopping_list_item
set unit = null
where unit is not null
  and unit not in (select key from public.nutrition_unit);

-- === 5. Column DEFAULTs ==============================================
-- Load-bearing for `ON DELETE SET DEFAULT`: without a default the reset
-- would write NULL and break the NOT NULL columns. `nutrition_food.unit`
-- gets none — it is RESTRICT and never reset.
alter table public.nutrition_pantry_item alter column location set default 'fridge';
alter table public.nutrition_pantry_item alter column unit set default 'g';
alter table public.nutrition_recipe_ingredient alter column unit set default 'g';
alter table public.nutrition_shopping_list_item alter column unit set default 'g';

-- === 6. Foreign keys (ADR-0017) ======================================
-- Delete is asymmetric: RESTRICT on the food base unit (deleting a unit in
-- use as any food's macro basis is blocked — reassign first); SET DEFAULT
-- everywhere else, where a reset to the protected default is harmless
-- (ADR-0016 already detects and flags a unit that differs from the food's).
alter table public.nutrition_food
  add constraint nutrition_food_unit_fkey
  foreign key (unit) references public.nutrition_unit (key)
  on delete restrict;

alter table public.nutrition_pantry_item
  add constraint nutrition_pantry_item_unit_fkey
  foreign key (unit) references public.nutrition_unit (key)
  on delete set default;

alter table public.nutrition_pantry_item
  add constraint nutrition_pantry_item_location_fkey
  foreign key (location) references public.nutrition_pantry_location (key)
  on delete set default;

alter table public.nutrition_recipe_ingredient
  add constraint nutrition_recipe_ingredient_unit_fkey
  foreign key (unit) references public.nutrition_unit (key)
  on delete set default;

alter table public.nutrition_shopping_list_item
  add constraint nutrition_shopping_list_item_unit_fkey
  foreign key (unit) references public.nutrition_unit (key)
  on delete set default;

-- Index the referencing columns: a vocabulary delete scans each referencer
-- to apply RESTRICT/SET DEFAULT, and the settings pickers group by them.
create index nutrition_food_unit_idx
  on public.nutrition_food (unit);
create index nutrition_pantry_item_unit_idx
  on public.nutrition_pantry_item (unit);
create index nutrition_pantry_item_location_idx
  on public.nutrition_pantry_item (location);
create index nutrition_recipe_ingredient_unit_idx
  on public.nutrition_recipe_ingredient (unit);
create index nutrition_shopping_list_item_unit_idx
  on public.nutrition_shopping_list_item (unit);
