-- Nutrition module, Phase 2b (#118): nutrition_shopping_list_item.
-- Hand-written migration (ADR-0008), single `public` schema, slug-prefixed
-- tables (ADR-0006). Spec: docs/modules/nutrition.md §3.4, §4, §8, §7
-- Phase 2.
--
-- Fixed **Family** (ADR-0004), same shared-kitchen template as the meal
-- plan and recipe box: any signed-in member reads, adds, checks off or
-- deletes any line.
--
-- `public.set_updated_at()` already exists (20260717042825_habits_tables).

-- === nutrition_shopping_list_item =====================================
-- A flat collection of shopping-list lines (§4) — there is no stored
-- date-range or list identifier: a "list for this week" is a diff run on
-- demand over the plan and pantry (§3.4), not a maintained row grouping.
-- Regenerating replaces `auto` lines only, leaving `manual` lines (added
-- directly by a member, not tied to any plan/pantry diff) untouched.
--
-- `food_id` is nullable: a `manual` line may be freeform text with no food
-- link at all, and an `auto` line's link is severed (`on delete set null`)
-- rather than deleting the line outright if its food is later removed —
-- the line still shows its snapshotted `display_text` (judgment call,
-- matching the meal plan's own "survive the thing it pointed at" choice
-- for `created_by`).
--
-- `display_text` is snapshotted at generation time (§3.4), not live-joined
-- to food/recipe — it's what's shown even if the food is renamed or
-- unlinked afterwards.
--
-- `source` distinguishes `auto` (written by the plan/pantry diff) from
-- `manual` (added directly): regeneration only ever replaces `auto` rows.
--
-- `added_by` is provenance only, not ownership (§2) — like the plan and
-- recipe box, the list is a shared kitchen (`on delete set null`).

create table public.nutrition_shopping_list_item (
  id uuid primary key default gen_random_uuid(),
  food_id uuid references public.nutrition_food (id) on delete set null,
  display_text text not null,
  quantity numeric,
  unit text,
  source text not null,
  checked_off boolean not null default false,
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nutrition_shopping_list_item_display_text_not_blank
    check (btrim(display_text) <> ''),
  constraint nutrition_shopping_list_item_source_valid
    check (source in ('auto', 'manual')),
  constraint nutrition_shopping_list_item_quantity_nonnegative
    check (quantity is null or quantity >= 0)
);

create index nutrition_shopping_list_item_food_id_idx
  on public.nutrition_shopping_list_item (food_id);

create index nutrition_shopping_list_item_source_idx
  on public.nutrition_shopping_list_item (source);

create trigger nutrition_shopping_list_item_set_updated_at
  before update on public.nutrition_shopping_list_item
  for each row execute function public.set_updated_at();

-- === RLS =============================================================
-- Fixed-Family template (ADR-0004/0007, §2, §10): the shopping list is one
-- shared thing. Any signed-in member reads and writes every row — no owner
-- clause. Signed out, the list does not exist.

alter table public.nutrition_shopping_list_item enable row level security;

create policy "nutrition_shopping_list_item_select_family" on public.nutrition_shopping_list_item
  for select
  using (auth.uid() is not null);

create policy "nutrition_shopping_list_item_insert_family" on public.nutrition_shopping_list_item
  for insert
  with check (auth.uid() is not null);

create policy "nutrition_shopping_list_item_update_family" on public.nutrition_shopping_list_item
  for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "nutrition_shopping_list_item_delete_family" on public.nutrition_shopping_list_item
  for delete
  using (auth.uid() is not null);
