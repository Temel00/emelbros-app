-- Nutrition module, Phase 2a (#115): nutrition_meal_plan_entry. Hand-written
-- migration (ADR-0008), single `public` schema, slug-prefixed tables
-- (ADR-0006). Spec: docs/modules/nutrition.md §2, §3.4, §4, §7 Phase 2.
--
-- Fixed **Family** (ADR-0004), same shared-kitchen template as
-- nutrition_recipe: any signed-in member plans, edits or deletes any entry.
--
-- `public.set_updated_at()` already exists (20260717042825_habits_tables).

-- === nutrition_meal_plan_entry ========================================
-- A recipe (or a freeform title, for "leftovers" / "eating out") assigned
-- to a `{ plan_date, meal_slot }` (§3.4). `meal_slot` holds a key from the
-- code-side registry (`breakfast`/`lunch`/`dinner`/`snack`) — no check
-- constraint restricting the set, the same additive-and-forgiving choice
-- `nutrition_pantry_item.location` makes (§10): a slot stored under a key
-- since retired from the registry still round-trips.
--
-- Exactly one of `recipe_id` / `freeform_title` is set — the check
-- constraint below is the boolean-inequality XOR idiom, `true <> true` and
-- `false <> false` both being false. `recipe_id` cascades: a plan entry
-- that pointed at a hard-deleted recipe can no longer satisfy the "recipe
-- or freeform title" shape on its own, and the plan is edited going
-- forward, not preserved as an orphan (judgment call — recipes are
-- ordinarily archived, not deleted, exactly so this stays rare).
--
-- `cooked_at` is null until a member marks the entry cooked (§3.4); that
-- action decrements the pantry (modules/nutrition/lib/pantry-decrement.ts)
-- and is what offers the "log this meal" shortcut (§3.5, Phase 3).
--
-- `created_by` is provenance only, not ownership (§2) — like the recipe
-- box, the plan is a shared kitchen, so an entry survives the member who
-- made it (`on delete set null`).

create table public.nutrition_meal_plan_entry (
  id uuid primary key default gen_random_uuid(),
  plan_date date not null,
  meal_slot text not null,
  recipe_id uuid references public.nutrition_recipe (id) on delete cascade,
  freeform_title text,
  servings_planned numeric not null default 1,
  cooked_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nutrition_meal_plan_entry_meal_slot_not_blank
    check (btrim(meal_slot) <> ''),
  constraint nutrition_meal_plan_entry_freeform_title_not_blank
    check (freeform_title is null or btrim(freeform_title) <> ''),
  constraint nutrition_meal_plan_entry_recipe_xor_freeform
    check ((recipe_id is not null) <> (freeform_title is not null)),
  constraint nutrition_meal_plan_entry_servings_planned_positive
    check (servings_planned > 0)
);

create index nutrition_meal_plan_entry_plan_date_idx
  on public.nutrition_meal_plan_entry (plan_date);

create index nutrition_meal_plan_entry_recipe_id_idx
  on public.nutrition_meal_plan_entry (recipe_id);

create trigger nutrition_meal_plan_entry_set_updated_at
  before update on public.nutrition_meal_plan_entry
  for each row execute function public.set_updated_at();

-- === RLS =============================================================
-- Fixed-Family template (ADR-0004/0007, §2, §10): the meal plan is one
-- shared thing. Any signed-in member reads and writes every row — no owner
-- clause. Signed out, the plan does not exist.

alter table public.nutrition_meal_plan_entry enable row level security;

create policy "nutrition_meal_plan_entry_select_family" on public.nutrition_meal_plan_entry
  for select
  using (auth.uid() is not null);

create policy "nutrition_meal_plan_entry_insert_family" on public.nutrition_meal_plan_entry
  for insert
  with check (auth.uid() is not null);

create policy "nutrition_meal_plan_entry_update_family" on public.nutrition_meal_plan_entry
  for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "nutrition_meal_plan_entry_delete_family" on public.nutrition_meal_plan_entry
  for delete
  using (auth.uid() is not null);
