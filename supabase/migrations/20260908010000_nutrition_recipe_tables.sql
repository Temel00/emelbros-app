-- Nutrition module, Phase 1b (#112): nutrition_recipe,
-- nutrition_recipe_ingredient. Hand-written migration (ADR-0008), single
-- `public` schema, slug-prefixed tables (ADR-0006).
-- Spec: docs/modules/nutrition.md §2, §3.3, §4, §7 Phase 1.
--
-- `nutrition_recipe` is fixed **Family** (ADR-0004), carrying no `scope`
-- column for the same reason the Phase 1a tables carry none: the answer is
-- always Family and nothing filters by it. `nutrition_recipe_ingredient`
-- has no policy of its own — it is **inherited**, riding the parent
-- recipe's visibility exactly as `darts_turn` rides `darts_game` and
-- `lists_item` rides `lists_list`.
--
-- `public.set_updated_at()` already exists (20260717042825_habits_tables).

-- === nutrition_recipe ================================================
-- A title, a servings count, instructions, and (below) an ordered list of
-- ingredient lines (§3.3). `archived_at` rather than a delete: a recipe
-- retired from the box is still referenced by past meal-plan entries and
-- log provenance, so the default list hides it and nothing is destroyed.
--
-- `created_by` is provenance only, not ownership (§2) — the recipe box is
-- a shared kitchen, so an entry survives the member who wrote it
-- (`on delete set null`) rather than vanishing with them.

create table public.nutrition_recipe (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  servings integer not null default 1,
  instructions text,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nutrition_recipe_title_not_blank check (btrim(title) <> ''),
  constraint nutrition_recipe_servings_positive check (servings > 0)
);

create index nutrition_recipe_active_idx
  on public.nutrition_recipe (title)
  where archived_at is null;

create trigger nutrition_recipe_set_updated_at
  before update on public.nutrition_recipe
  for each row execute function public.set_updated_at();

-- === nutrition_recipe_ingredient =====================================
-- One ingredient line (§3.3, §4). `display_text` is the line as written
-- ("2 cloves garlic, minced") and is the only required field: an unlinked
-- line still renders, it just contributes nothing to the plan/pantry diff
-- or the nutrition roll-up. `food_id`, `quantity` and `unit` together are
-- the optional link that makes those calculations possible.
--
-- `food_id` is `on delete set null`, deliberately unlike
-- `nutrition_pantry_item.food_id`'s cascade: removing a dictionary entry
-- must not silently delete "2 cloves garlic" from a recipe. The line
-- degrades to an unlinked one, which is a shape the recipe already
-- supports.
--
-- `position` is a contiguous zero-based index within the recipe, the same
-- convention `lists_item` uses. No unique constraint on
-- (recipe_id, position): a reorder rewrites several rows one statement at
-- a time and would trip a non-deferrable unique mid-flight, and a
-- transient duplicate only affects display order.

create table public.nutrition_recipe_ingredient (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null
    references public.nutrition_recipe (id) on delete cascade,
  food_id uuid references public.nutrition_food (id) on delete set null,
  display_text text not null,
  quantity numeric,
  unit text,
  position integer not null default 0,
  constraint nutrition_recipe_ingredient_display_text_not_blank
    check (btrim(display_text) <> ''),
  constraint nutrition_recipe_ingredient_quantity_non_negative
    check (quantity is null or quantity >= 0),
  constraint nutrition_recipe_ingredient_position_non_negative
    check (position >= 0)
);

create index nutrition_recipe_ingredient_recipe_id_idx
  on public.nutrition_recipe_ingredient (recipe_id, position);

create index nutrition_recipe_ingredient_food_id_idx
  on public.nutrition_recipe_ingredient (food_id);

-- === RLS =============================================================
-- Fixed-Family template on the recipe (ADR-0004/0007, §2, §10): any
-- signed-in member reads and writes every row, no owner clause. Signed
-- out, the recipe box does not exist.

alter table public.nutrition_recipe enable row level security;

create policy "nutrition_recipe_select_family" on public.nutrition_recipe
  for select
  using (auth.uid() is not null);

create policy "nutrition_recipe_insert_family" on public.nutrition_recipe
  for insert
  with check (auth.uid() is not null);

create policy "nutrition_recipe_update_family" on public.nutrition_recipe
  for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "nutrition_recipe_delete_family" on public.nutrition_recipe
  for delete
  using (auth.uid() is not null);

-- Inherited policy on the ingredient: an ingredient row is reachable only
-- through a parent recipe the caller can already reach. The parent's own
-- rule (`auth.uid() is not null`) is restated inline rather than
-- delegated, because a policy's subquery runs as the table owner and does
-- not re-apply the parent's RLS — the same reason `lists_item` restates
-- `lists_list`'s scope clause instead of just proving the parent exists.

alter table public.nutrition_recipe_ingredient enable row level security;

create policy "nutrition_recipe_ingredient_select" on public.nutrition_recipe_ingredient
  for select
  using (
    exists (
      select 1 from public.nutrition_recipe r
      where r.id = nutrition_recipe_ingredient.recipe_id
        and auth.uid() is not null
    )
  );

create policy "nutrition_recipe_ingredient_insert" on public.nutrition_recipe_ingredient
  for insert
  with check (
    exists (
      select 1 from public.nutrition_recipe r
      where r.id = nutrition_recipe_ingredient.recipe_id
        and auth.uid() is not null
    )
  );

create policy "nutrition_recipe_ingredient_update" on public.nutrition_recipe_ingredient
  for update
  using (
    exists (
      select 1 from public.nutrition_recipe r
      where r.id = nutrition_recipe_ingredient.recipe_id
        and auth.uid() is not null
    )
  )
  with check (
    exists (
      select 1 from public.nutrition_recipe r
      where r.id = nutrition_recipe_ingredient.recipe_id
        and auth.uid() is not null
    )
  );

create policy "nutrition_recipe_ingredient_delete" on public.nutrition_recipe_ingredient
  for delete
  using (
    exists (
      select 1 from public.nutrition_recipe r
      where r.id = nutrition_recipe_ingredient.recipe_id
        and auth.uid() is not null
    )
  );
