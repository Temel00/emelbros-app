# Nutrition module — spec

The **nutrition** module is the family's food system end to end: what's in the
pantry, what recipes exist, what's planned to cook, what needs buying, and —
the destination the rest exists to serve — a per-member record of what was
actually eaten, so nutrition can be reviewed as a trend over time rather than
a single day.

Uses the platform vocabulary from `CONTEXT.md` verbatim: Module, Module
Manifest, Scope (Private / Participants / Family), Scope Policy, Widget,
Dashboard, Pinned.

- **Slug**: `nutrition`
- **Milestone**: after darts, lists, and habits — a new module, not part of
  the v1 map (issue #1)

## 0. Shape of the system

One module, six tables, five stages that hand off to each other:

```
Food dictionary  ──┐
                    ├─▶ Pantry (inventory)
                    │
Recipes ────────────┼─▶ Meal plan ──▶ Shopping list ──▶ (restocks) Pantry
                    │         │
                    │         └─▶ "mark cooked" (decrements Pantry)
                    │
                    └────────────────────────────────▶ Nutrition log ──▶ Overview
```

Everything upstream of the log — the food dictionary, pantry, recipes, meal
plan, shopping list — is a **shared household resource**: Family-scope,
fixed, no owner. The **log** is the one place data turns personal: each
member's record of what they ate is theirs alone (§2).

**Where Notion and n8n fit.** v1 builds entirely in-app on Supabase — the
nutrition-over-time views this module exists for need real queries, which a
second system of record would only complicate. Two integrations are
worth doing later, once the core is proven, and are deliberately **not**
speced here (§9):

- **Notion** as an optional richer authoring surface for recipes (photos,
  long-form notes) that syncs into `nutrition_recipe` on save, for whoever
  prefers writing recipes there to the in-app form.
- **n8n** for automation the app doesn't do itself: barcode/receipt capture
  into the pantry, pulling nutrition facts for a new food from a public food
  database API, and reminders (plan next week, low-stock, items expiring
  soon).

## 1. Entities

- **Food** (`nutrition_food`) — a shared dictionary entry: a nameable food or
  ingredient with its nutrition facts per unit. The thing both the pantry and
  recipes point at, and what a log entry snapshots from.
- **Pantry item** (`nutrition_pantry_item`) — one line of household
  inventory: a food, a quantity, a location, an optional expiry.
- **Recipe** (`nutrition_recipe`) — a title, servings, instructions, and an
  ordered list of ingredient lines.
- **Recipe ingredient** (`nutrition_recipe_ingredient`) — one ingredient line
  on a recipe, optionally linked to a `Food` for nutrition math.
- **Meal plan entry** (`nutrition_meal_plan_entry`) — a recipe (or a freeform
  meal) assigned to a date and a meal slot.
- **Shopping list item** (`nutrition_shopping_list_item`) — one line to buy,
  either auto-generated from a plan/pantry gap or added by hand.
- **Nutrition log** (`nutrition_log`) — one dated entry of what a member
  actually ate: linked to a food or recipe where possible, freeform
  otherwise, with macros snapshotted at log time.

## 2. Scope & sharing

Per-table Scope Policy (ADR-0004), enforced by RLS alone (ADR-0007):

| table                          | policy  | scope       | who writes                                |
| ------------------------------ | ------- | ----------- | ------------------------------------------ |
| `nutrition_food`                | fixed   | `family`    | any signed-in member                       |
| `nutrition_pantry_item`         | fixed   | `family`    | any signed-in member                       |
| `nutrition_recipe`               | fixed   | `family`    | any signed-in member                       |
| `nutrition_recipe_ingredient`    | inherited | from `nutrition_recipe` | rides the parent recipe        |
| `nutrition_meal_plan_entry`      | fixed   | `family`    | any signed-in member                       |
| `nutrition_shopping_list_item`   | fixed   | `family`    | any signed-in member                       |
| `nutrition_log`                  | fixed   | `private`   | the owning member only (`member_id = auth.uid()`) |

Everything but the log is a **shared kitchen**, not owned by whoever created
the row — like `darts_game`, any member can edit or delete any pantry item,
recipe, plan entry, or shopping-list line (Family RLS template:
`using (auth.uid() is not null)`). There's no per-record participant
narrowing here; the household either sees and edits the kitchen, or (signed
out) it doesn't exist for them.

`nutrition_log` is the deliberate exception, using the fixed-Private RLS
template (`using (auth.uid() = member_id)`) rather than member-chosen: unlike
`habits_trackable`, there's no v1 case for ever sharing an individual log
entry, so it's simplest to hardcode it private rather than carry a `scope`
column and per-record toggle nothing uses. Revisit as member-chosen only if
a real "share your log" want shows up (§9).

## 3. Flows

### 3.1 Food dictionary

The shared reference list every other stage points at. A member adds a food
once (name, unit, calories/macros per unit, optional barcode) and it's
reusable from the pantry, recipe ingredients, and the log's food picker. No
approval step — any member can add or correct an entry; corrections ripple
forward (new pantry items, new recipe ingredients, new logs) but never
rewrite past log snapshots (§3.5).

### 3.2 Pantry

Household inventory: a list of `{ food, quantity, unit, location, expires_on }`
rows any member can add to, adjust, or remove — after a grocery trip, after
cooking, or just correcting a count. `location` is a small code-side registry
(`fridge` / `freezer` / `pantry` / `other`), the same extension-point shape
lists/habits use for `kind` — nothing schema-level, just a label + icon per
key.

### 3.3 Recipes

A recipe is a title, a servings count, free-text instructions, and an
ordered list of ingredient lines. Each ingredient line is free text (`"2
cloves garlic, minced"`) plus an *optional* link to a `Food` dictionary
entry with a quantity + unit — the link is what lets meal planning diff
against pantry and lets a cooked meal roll up nutrition; an unlinked line
(`"salt to taste"`) still renders in the recipe but contributes nothing to
either calculation. Linking suggests existing foods and offers "add as a new
food" inline rather than blocking on the dictionary being complete first.

### 3.4 Meal plan → shopping list → pantry

- **Plan** — assign a recipe (or a freeform title, for "leftovers" /
  "eating out") to a `{ date, meal slot }`. A simple week-at-a-glance
  calendar, not a generic scheduler.
- **Generate the shopping list** — for a date range, sum each planned
  recipe's linked ingredients (scaled to planned servings), subtract what's
  already in the pantry, and write the shortfall as `auto`-sourced shopping
  list lines; manual additions (`manual`-sourced) sit alongside them. This is
  a diff run on demand, not a live-maintained list — re-running it after
  editing the plan regenerates the auto lines without touching manual ones.
- **Shop** — check items off while shopping; a checked `auto` line's
  quantity gets added back into the matching pantry item (or creates one) so
  the pantry stays current without re-entering what you just bought.
- **Cook** — marking a plan entry "cooked" decrements the pantry by that
  recipe's linked ingredients (scaled to servings actually made) and is what
  offers the "log this meal" shortcut (§3.5). Cooking is optional to mark —
  nothing breaks if a member just eats and logs without ever touching the
  plan.

### 3.5 Logging

The record the whole system serves: what a member actually ate, whenever
they ate it — planned or not. Three ways in:

- **From a cooked meal** — one tap from a plan entry marked cooked, prefilled
  with that recipe's per-serving macros for the portion size (adjustable).
- **From the food dictionary** — pick a food, enter a quantity; macros
  compute from the food's per-unit values.
- **Freeform** — a description and, optionally, a rough calorie/macro
  estimate, for anything not in the dictionary (a restaurant meal).

A log entry **snapshots** its macros at write time rather than
foreign-keying live into `nutrition_food`/`nutrition_recipe` for its numbers
— correcting a food's calorie value later shouldn't silently rewrite last
month's history. The link to the food/recipe is kept for provenance and
"log this again" convenience, not for live recomputation.

### 3.6 Overview

Per-member, derived at read time (never stored) from `nutrition_log`:
daily and weekly totals for calories and each macro, and a trend over a
chosen date range. This is the payoff view — everything upstream exists to
make logging easy enough that it actually happens.

## 4. Data model

One `public` schema, slug-prefixed tables (ADR-0006). Hand-written migration
(ADR-0008); generated types land in `types/database.ts`.

**`nutrition_food`**

| column                  | type        | notes                                      |
| ------------------------ | ----------- | ------------------------------------------ |
| `id`                      | uuid pk     |                                             |
| `name`                    | text        | required                                   |
| `brand`                   | text        | optional                                   |
| `barcode`                 | text        | optional, unique when present              |
| `unit`                    | text        | e.g. `g`, `ml`, `each` — the basis for the per-unit macros below |
| `calories_per_unit`       | numeric     |                                             |
| `protein_g_per_unit`      | numeric     |                                             |
| `carbs_g_per_unit`        | numeric     |                                             |
| `fat_g_per_unit`          | numeric     |                                             |
| `fiber_g_per_unit`        | numeric     | optional                                   |
| `created_by`              | uuid        | the member who added it                    |
| `created_at` / `updated_at` | timestamptz |                                           |

**`nutrition_pantry_item`**

| column        | type        | notes                                            |
| -------------- | ----------- | ------------------------------------------------- |
| `id`            | uuid pk     |                                                    |
| `food_id`       | uuid fk     | → `nutrition_food`                                |
| `quantity`      | numeric     |                                                    |
| `unit`          | text        | usually matches the food's unit (no v1 conversion) |
| `location`      | text        | a registry key: `fridge`/`freezer`/`pantry`/`other` |
| `expires_on`    | date        | optional                                          |
| `added_by`      | uuid        | last member to touch this row                     |
| `created_at` / `updated_at` | timestamptz |                                      |

**`nutrition_recipe`**

| column         | type        | notes                              |
| --------------- | ----------- | ----------------------------------- |
| `id`             | uuid pk     |                                     |
| `title`          | text        | required                           |
| `servings`       | integer     | required, default `1`              |
| `instructions`   | text        | free text                          |
| `notes`          | text        | optional                           |
| `created_by`     | uuid        |                                     |
| `archived_at`    | timestamptz | null = active                      |
| `created_at` / `updated_at` | timestamptz |                       |

**`nutrition_recipe_ingredient`**

| column        | type    | notes                                         |
| -------------- | ------- | ---------------------------------------------- |
| `id`            | uuid pk |                                                |
| `recipe_id`     | uuid fk | → `nutrition_recipe`, cascade delete           |
| `food_id`       | uuid fk | → `nutrition_food`, nullable (unlinked lines)  |
| `display_text`  | text    | the ingredient line as written, e.g. "2 cloves garlic, minced" |
| `quantity`      | numeric | nullable ("salt to taste")                     |
| `unit`          | text    | nullable                                       |
| `position`      | integer | ordering within the recipe                     |

**`nutrition_meal_plan_entry`**

| column             | type        | notes                                        |
| -------------------- | ----------- | --------------------------------------------- |
| `id`                  | uuid pk     |                                                |
| `plan_date`           | date        |                                                |
| `meal_slot`           | text        | registry key: `breakfast`/`lunch`/`dinner`/`snack` |
| `recipe_id`           | uuid fk     | → `nutrition_recipe`, nullable                |
| `freeform_title`      | text        | used when `recipe_id` is null                 |
| `servings_planned`    | numeric     | default `1`                                   |
| `cooked_at`           | timestamptz | null until marked cooked; drives pantry decrement + log shortcut |
| `created_by`          | uuid        |                                                |
| `created_at` / `updated_at` | timestamptz |                                          |

Check constraint: exactly one of `recipe_id` / `freeform_title` is set.

**`nutrition_shopping_list_item`**

| column         | type        | notes                                        |
| --------------- | ----------- | ---------------------------------------------- |
| `id`             | uuid pk     |                                                |
| `food_id`        | uuid fk     | → `nutrition_food`, nullable (freeform lines)  |
| `display_text`   | text        | the line as shown, snapshotted at generation   |
| `quantity`       | numeric     | nullable                                       |
| `unit`           | text        | nullable                                       |
| `source`         | text        | `auto` (from plan/pantry diff) or `manual`     |
| `checked_off`    | boolean     | default `false`                                |
| `added_by`       | uuid        |                                                |
| `created_at` / `updated_at` | timestamptz |                                    |

**`nutrition_log`**

| column          | type        | notes                                              |
| ---------------- | ----------- | --------------------------------------------------- |
| `id`              | uuid pk     |                                                      |
| `member_id`       | uuid        | the owning member (fixed Private RLS key, §2)       |
| `logged_at`       | timestamptz | when eaten                                          |
| `food_id`         | uuid fk     | → `nutrition_food`, nullable                        |
| `recipe_id`       | uuid fk     | → `nutrition_recipe`, nullable                      |
| `description`     | text        | freeform label; required when neither link is set   |
| `quantity`        | numeric     | nullable                                            |
| `unit`            | text        | nullable                                            |
| `calories`        | numeric     | snapshotted at log time                             |
| `protein_g`        | numeric     | snapshotted                                         |
| `carbs_g`          | numeric     | snapshotted                                         |
| `fat_g`             | numeric     | snapshotted                                         |
| `note`            | text        | optional                                            |
| `created_at`      | timestamptz |                                                      |

## 5. Module Manifest

Code-first typed manifest (ADR-0001), registered in `modules/index.ts`.

- **Identity** — name "Nutrition", slug `nutrition`, icon (`UtensilsCrossed`
  or similar), description.
- **Scopes (informational, per ADR-0004)** — as tabulated in §2.
- **Widgets** — one (§6).
- **`profileSections: []`** — none in v1; a member's nutrition history is
  private (§2), so there's nothing to surface on a shared profile page.

## 6. Widget: Nutrition

One Widget (ADR-0005): a zero-prop React Server Component about the current
member. Ships with Phase 3 (§7), once logging exists.

- **Shows** — today's logged calories so far against nothing else (no goal/
  target in v1, §9), plus today's planned meals with a done/not-done mark
  per slot.
- **Empty state** — nothing logged today yet: a prompt to log a meal.
- Fetches its own data via the module's `queries.ts` and the platform
  current-member helper.
- Uniform v1 card size; no size variants (ADR-0005).

## 7. Build order

Three phases, each a small set of agent-scoped tickets (~10 files, ~100K
context, one PR — per `docs/agents/agent-loop.md`). Phase 2 depends on
Phase 1's tables existing; Phase 3's log doesn't strictly need Phase 2, but
ships after it so "log this cooked meal" (§3.5) has something to hook into
day one.

1. **Pantry + recipes** — `nutrition_food`, `nutrition_pantry_item`,
   `nutrition_recipe`, `nutrition_recipe_ingredient`; module scaffold,
   manifest registration, and CRUD UI for both. Useful on its own: a shared
   pantry tracker and recipe box.
2. **Meal plan + shopping list** — `nutrition_meal_plan_entry`,
   `nutrition_shopping_list_item`; week calendar, list generation (§3.4),
   check-off-restocks-pantry, mark-cooked-decrements-pantry.
3. **Log + overview** — `nutrition_log`, the log-entry flows (§3.5), the
   overview/trend view (§3.6), and the widget (§6).

## 8. Deferred / out of scope (v1)

- **Unit conversion** — pantry/recipe/shopping quantities assume matching
  units; no g↔oz or cup↔ml conversion engine. Revisit if mismatched units
  become a real friction point.
- **Nutrition goals/targets** — the overview charts trends only, no calorie
  or macro target with a progress bar (mirrors habits' "metrics chart a
  trend only" default, `docs/modules/habits.md` §8).
- **Multi-household shopping** — shopping list stays one flat Family list;
  no per-store or per-trip splitting.
- **Recipe scaling beyond servings math** — no unit-smart scaling (e.g. "1.5
  eggs"); scaling multiplies quantities as entered.
- **Barcode/receipt scanning, external nutrition-API lookups, reminders** —
  the n8n automations noted in §0/§9; no in-app scanning or notifications
  in v1.
- **Notion recipe sync** — noted in §0/§9; not built until the in-app
  recipe flow is proven.
- **Reminders/notifications generally** — platform-wide, PWA push is
  deferred (map #1), matching every other module.

## 9. Notion & n8n integration (roadmap, not v1)

Recorded here so the shape is decided even though nothing below is built in
Phase 1–3:

- **Notion.** A recipe authored/edited in a designated Notion database syncs
  into `nutrition_recipe` + `nutrition_recipe_ingredient` via an n8n
  workflow triggered on page update, matched by a `notion_page_id` column
  added to `nutrition_recipe` at that time (not in §4 — added only if this
  ships). One-way (Notion → Supabase) to start; the in-app editor stays the
  source of truth for anything created there.
- **n8n.**
  - **Barcode/receipt capture** — a webhook or Telegram/shortcut integration
    that resolves a scanned barcode against `nutrition_food` (or an
    external food database, creating the dictionary entry if missing) and
    upserts a `nutrition_pantry_item` row.
  - **Low-stock / expiring-soon digest** — a scheduled workflow that reads
    `nutrition_pantry_item` and notifies (email/push/whatever channel) when
    something's low or near `expires_on`.
  - **"Plan next week" nudge** — a scheduled reminder when no
    `nutrition_meal_plan_entry` rows exist for the coming week.

Each is a self-contained addition once its trigger exists — none blocks
Phase 1–3, and none needs deciding further until picked up.

## 10. Defaults worth noting

Not separate decisions — sensible defaults recorded so they aren't
re-litigated:

- **Everything but the log is Family-scope and unowned** — any member can
  edit or delete any pantry item, recipe, plan entry, or shopping-list line,
  matching darts' shared-resource model rather than lists/habits' per-owner
  model. The kitchen is one shared thing.
- **The log is fixed Private, not member-chosen** — simplest table that
  covers the only case that exists today; revisit only if sharing an
  individual log entry becomes a real want.
- **Log entries snapshot macros, never recompute live** — correcting a food
  or recipe's nutrition facts later doesn't rewrite historical logs (§3.5).
- **Shopping-list generation is an on-demand diff, not a maintained list** —
  re-running it after editing the plan regenerates `auto` lines without
  touching `manual` ones.
- **`location` and `meal_slot` are small code-side registries**, exactly the
  `kind` extension-point shape lists/habits use — adding `pantry-shelf-2` or
  a `brunch` slot is a code change, not a migration.
- **Overview numbers are derived at read time**, never stored, so editing or
  backfilling a log recomputes trends for free (mirrors habits' streaks).
