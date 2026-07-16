# Lists module — spec

The **lists** module is the family's shared surface for checkable lists: shopping
lists, to-dos, and plain notes today, with room for more kinds later. It is the
canonical **member-chosen scope** module named throughout the module contract
(ADR-0004). This is the first module spec; it also sets the shape later module
specs (darts, habits) follow.

Uses the platform vocabulary from `CONTEXT.md` verbatim: Module, Module Manifest,
Scope (Private / Participants / Family), Scope Policy, Widget, Dashboard, Pinned.

- **Slug**: `lists`
- **Milestone**: 3 (after the walking skeleton and darts — see map #1)

## 1. What a list is

One generic **list** entity carries everything: a title, an owning member, a
Scope, and an ordered set of checkable **items**. There is no per-type table.

What distinguishes a shopping list from a notes list is its **kind** — a single
value on the list that is the module's designed-in **extension point**. Adding a
new kind of list (a packing list, a wishlist, whatever the owner dreams up later)
is appending one entry to a code-side registry; it needs a migration only when
the new kind wants columns the base list/item don't already have.

Chores-style behavior — recurrence and per-item assignment — is deliberately
**not** in the base model. It would arrive later as a `chores` kind that adds its
own columns, or in the habits module. Keeping it out keeps every list one flat,
collaborative, checkable surface.

### The kind registry

Kinds live in code (declared alongside the Module Manifest), not the database.
Each entry is:

```ts
type ListKind = {
  key: string;        // stored on the list row, e.g. "shopping"
  label: string;      // "Shopping"
  icon: string;       // lucide icon name
  checkable: boolean;  // do items show a checkbox?
};
```

Shipping in v1:

| key        | label    | checkable | notes                                  |
| ---------- | -------- | --------- | -------------------------------------- |
| `shopping` | Shopping | `true`    | check items off as you buy them        |
| `todo`     | To-do    | `true`    | general task list                      |
| `notes`    | Notes    | `false`   | plain text lines, no checkbox rendered  |

`checkable` is the proof the extension point does real work rather than being
cosmetic: a `notes` list renders its items as plain lines. The `checked` column
still exists on every item (see below) — a non-checkable kind simply never sets
or shows it, so switching a list's kind never loses or breaks data.

The stored `kind` is a plain string. If a list's kind key is ever removed from
the registry, the module falls back to default (checkable, generic icon)
rendering rather than erroring — kinds are additive and forgiving.

## 2. Scope & sharing

The one `lists_list` table has a **member-chosen** Scope Policy (ADR-0004): the
owning member picks Private / Participants / Family per list and may change it
later. Flipping a Private list to Family, or narrowing it back, is a supported
operation the RLS must handle.

**Edit rights are uniform — there is no per-list view-vs-collaborate mode:**

- **Any member who can *see* a list** (its owner; a listed participant when
  Participants; every member when Family) can **add items, check/uncheck them,
  edit item text, reorder, and run the bulk actions.** A shared list is one
  collaborative surface — the whole point of a shared shopping list is that
  everyone pitches in.
- **Only the owner** can rename the list, change its Scope, set its participants,
  archive it, or delete it.

### Visibility rules (RLS)

Scope enforcement is RLS-only (ADR-0004) using the canonical member-chosen
templates from ADR-0007. In plain terms:

- **`lists_list` SELECT** — visible when: you are the owner; OR scope is `family`;
  OR scope is `participants` and you have a row in `lists_participant`. (Private
  is owner-only, covered by the owner clause.)
- **`lists_list` UPDATE / DELETE** — owner only. (Renames, scope changes,
  archive, participant changes, list deletion.)
- **`lists_item` SELECT / INSERT / UPDATE / DELETE** — allowed when you can SELECT
  the parent `lists_list` row. Item writes ride entirely on list visibility, which
  is exactly "see it → edit its items."
- **`lists_participant`** — the owner of the referenced list manages its rows;
  SELECT follows parent-list visibility.

## 3. Item lifecycle

An item is minimal: `{ text, checked, position }` under a parent list.

- **Check off** — sets `checked = true`. Checked items stay visible with
  strikethrough and **sink below** the active items (ordering: active first by
  `position`, then checked). No item disappears on being checked.
- **Uncheck** — back to active.
- **Edit text**, **reorder** (drag → new `position`), **delete one item**.

Two list-level bulk actions make lists reusable and tidy:

- **Uncheck all** — resets every item to active. This is how a weekly shopping
  list is reused: buy everything, then reset for next week.
- **Clear checked** — **permanently deletes** all checked items (hard delete).
  This is how bought/done items are cleared out for good.

There is **no item-level archive or history** in v1 — deletes are hard. Archival
lives at the **list** level:

- **Archive a list** (owner) — soft: sets `archived_at`, hiding it from the active
  lists view and the widget while keeping it fully recoverable.
- **Delete a list** (owner) — removes the list and its items.

## 4. Data model

One `public` schema, slug-prefixed tables (ADR-0006). Hand-written migration
(ADR-0008); generated types land in `types/database.ts`.

**`lists_list`**

| column            | type          | notes                                         |
| ----------------- | ------------- | --------------------------------------------- |
| `id`              | uuid pk       |                                               |
| `owner_member_id` | uuid          | the owning member                             |
| `title`           | text          | required                                      |
| `kind`            | text          | a registry key; free string, forgiving        |
| `scope`           | `scope` enum  | member-chosen: `private`/`participants`/`family` |
| `archived_at`     | timestamptz   | null = active                                 |
| `created_at`      | timestamptz   |                                               |
| `updated_at`      | timestamptz   |                                               |

**`lists_item`**

| column       | type        | notes                             |
| ------------ | ----------- | --------------------------------- |
| `id`         | uuid pk     |                                   |
| `list_id`    | uuid fk     | → `lists_list`, cascade delete    |
| `text`       | text        | required                          |
| `checked`    | boolean     | default `false`                   |
| `position`   | integer     | manual ordering within the list   |
| `created_at` | timestamptz |                                   |

**`lists_participant`** — the Participants-scope join table (ADR-0007 pattern)

| column      | type    | notes                          |
| ----------- | ------- | ------------------------------ |
| `list_id`   | uuid fk | → `lists_list`, cascade delete |
| `member_id` | uuid    | a participating member         |

Primary key `(list_id, member_id)`. Rows exist only for `participants`-scope
lists; ignored for other scopes.

The `scope` enum is the shared platform enum from ADR-0007, not a lists-local
type.

## 5. Module Manifest

Code-first typed manifest (ADR-0001), registered in `modules/index.ts`.

- **Identity** — name "Lists", slug `lists`, icon, description.
- **Scopes (informational, per ADR-0004)** — `lists_list`: member-chosen;
  `lists_item`: inherits the parent list's visibility; `lists_participant`:
  participant join. This declaration is a truthful catalog label; RLS is the only
  enforcement.
- **Widgets** — one (below).
- **`profileSections: []`** — none in v1.

## 6. Widget: My Lists

One Widget (ADR-0005): a zero-prop React Server Component about the current
member, rendered inside the platform card frame.

- **Shows** — lists the current member owns **or** can see (Family, or
  Participants lists they're on), **excluding archived**, most-recently-active
  first, capped at ~5.
- **Per row** — kind icon, title, and an **unchecked-item count** ("4 to buy",
  "2 left", or "done" at zero). Tapping a row opens that list.
- Fetches its own data via the module's `queries.ts` and the platform
  current-member helper; the dashboard passes it nothing (ADR-0005).
- Uniform v1 card size; no size variants (ADR-0005).

## 7. Deferred / out of scope

Consciously left for later so v1 stays a flat, collaborative, checkable surface:

- **Chores** — recurrence + per-item assignment. A future `chores` kind (adds
  columns) or the habits module.
- **Per-kind fields** — shopping quantity/aisle, a notes detail/body. Added with
  the kind that needs them, via a migration then.
- **Item history / item-level archive** — v1 item deletes are hard.
- **Profile section** — surfacing a member's visible lists on their profile;
  revisit after the dashboard prototype.
- **Per-list view-only mode** — every shared list is collaborative in v1.
- **Widget size variants** — deferred platform-wide (ADR-0005).

## 8. Defaults worth noting

Not separate decisions — sensible defaults recorded so they aren't re-litigated:

- **Title required**; empty lists are allowed (a list with no items yet is fine).
- **Reordering** is manual `position` (drag); no auto-sort beyond active-then-checked.
- **Kind is chosen at creation** and may be changed later by the owner; because the
  base model is shared, changing kind never migrates data.
- A member who owns a Participants list is always implicitly able to see it; the
  participant list need not include the owner.
