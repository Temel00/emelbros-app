-- Nutrition module, Phase 3 (#121): nutrition_log.
-- Hand-written migration (ADR-0008), single `public` schema, slug-prefixed
-- tables (ADR-0006). Spec: docs/modules/nutrition.md §2, §3.5, §4, §10, §7
-- Phase 3.
--
-- Fixed **Private** (ADR-0004, ADR-0007) — the lone exception in this
-- module. Every other nutrition table is a shared kitchen (Family); a
-- member's own eating history is not. RLS is `auth.uid() = member_id` for
-- select, insert, update and delete, not the `auth.uid() is not null`
-- template used everywhere else in `nutrition`.
--
-- `public.set_updated_at()` already exists (20260717042825_habits_tables).

-- === nutrition_log ======================================================
-- One row per logged entry, `member_id` owned. `food_id` and `recipe_id`
-- are both nullable and independently optional: an entry may link neither
-- (freeform, `description` required), one, or in principle both, though
-- §3.5's three paths only ever set one. Both links are `on delete set
-- null` — provenance and log-this-again convenience only (§4), never a
-- join the macros depend on at read time.
--
-- `calories`, `protein_g`, `carbs_g` and `fat_g` are snapshotted at write
-- time (§3.5, §10) — never recomputed live from `nutrition_food` or
-- `nutrition_recipe` later. Correcting a food's calories must not rewrite
-- last month's history. This is deliberate and is not to be simplified
-- into a live join.

create table public.nutrition_log (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users (id) on delete cascade,
  logged_at timestamptz not null default now(),
  food_id uuid references public.nutrition_food (id) on delete set null,
  recipe_id uuid references public.nutrition_recipe (id) on delete set null,
  description text,
  quantity numeric,
  unit text,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nutrition_log_description_required_when_unlinked
    check (
      food_id is not null
      or recipe_id is not null
      or (description is not null and btrim(description) <> '')
    ),
  constraint nutrition_log_quantity_nonnegative
    check (quantity is null or quantity >= 0),
  constraint nutrition_log_calories_nonnegative
    check (calories is null or calories >= 0),
  constraint nutrition_log_protein_g_nonnegative
    check (protein_g is null or protein_g >= 0),
  constraint nutrition_log_carbs_g_nonnegative
    check (carbs_g is null or carbs_g >= 0),
  constraint nutrition_log_fat_g_nonnegative
    check (fat_g is null or fat_g >= 0)
);

create index nutrition_log_member_id_logged_at_idx
  on public.nutrition_log (member_id, logged_at);

create index nutrition_log_food_id_idx
  on public.nutrition_log (food_id);

create index nutrition_log_recipe_id_idx
  on public.nutrition_log (recipe_id);

create trigger nutrition_log_set_updated_at
  before update on public.nutrition_log
  for each row execute function public.set_updated_at();

-- === RLS =================================================================
-- Fixed-Private template (ADR-0004/0007, §2, §10): a member's own log rows
-- only. No other member, signed in or not, may read, insert as, update or
-- delete another member's entries.

alter table public.nutrition_log enable row level security;

create policy "nutrition_log_select_private" on public.nutrition_log
  for select
  using (auth.uid() = member_id);

create policy "nutrition_log_insert_private" on public.nutrition_log
  for insert
  with check (auth.uid() = member_id);

create policy "nutrition_log_update_private" on public.nutrition_log
  for update
  using (auth.uid() = member_id)
  with check (auth.uid() = member_id);

create policy "nutrition_log_delete_private" on public.nutrition_log
  for delete
  using (auth.uid() = member_id);
