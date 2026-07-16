# Habits module — spec

The **habits** module is a member's personal surface for tracking things over
time: scheduled habits you check off (exercise, vitamins, reading) and health
metrics you log a number for (weight, sleep, minutes exercised). It follows the
shape the [lists module](./lists.md) set — one generic entity plus a code-side
**kind** registry as the extension point — and, like lists, uses **member-chosen
Scope** enforced by RLS alone.

Uses the platform vocabulary from `CONTEXT.md` verbatim: Module, Module Manifest,
Scope (Private / Participants / Family), Scope Policy, Widget, Dashboard, Pinned.

- **Slug**: `habits`
- **Milestone**: 4 (after the walking skeleton, darts, and lists — see map #1)

## 1. What a trackable is

One generic **trackable** entity carries everything: a title, an owning member, a
Scope, a **kind**, an optional cadence, and an ordered history of dated **log**
entries. There is no per-type table — weight and a morning-run habit are the same
row shape with a different kind.

What distinguishes a check-off habit from a numeric metric is its **kind** — a
single value on the trackable that is the module's designed-in **extension
point**, exactly as `kind` is for a list. A kind's `valueType` decides whether a
log entry is a checkbox or a number; adding a new kind (steps, mood, water) is
appending one entry to a code-side registry, needing a migration only when the
new kind wants columns the base trackable/log don't already have.

### The kind registry

Kinds live in code (declared alongside the Module Manifest), not the database.
Each entry is:

```ts
type TrackableKind = {
  key: string;                      // stored on the trackable row, e.g. "weight"
  label: string;                    // "Weight"
  icon: string;                     // lucide icon name
  valueType: "boolean" | "number";  // check-off habit vs measured metric
  unit?: string;                    // for number kinds: "kg", "hrs", "min"
  scheduled: boolean;               // does this kind carry a cadence + streak?
};
```

Shipping in v1:

| key        | label    | valueType | unit  | scheduled | notes                              |
| ---------- | -------- | --------- | ----- | --------- | ---------------------------------- |
| `habit`    | Habit    | `boolean` | —     | `true`    | generic scheduled check-off habit  |
| `weight`   | Weight   | `number`  | `kg`  | `false`   | body weight over time              |
| `sleep`    | Sleep    | `number`  | `hrs` | `false`   | hours slept                        |
| `exercise` | Exercise | `number`  | `min` | `false`   | minutes of activity                |

`valueType` is the proof the extension point does real work rather than being
cosmetic (the role `checkable` plays in lists): a `boolean` kind renders a
checkbox and a streak, a `number` kind renders a value input and a trend. Both
the `done` and `value` columns exist on **every** log row (see §4) — a kind
simply uses the one its `valueType` names and ignores the other, so nothing
breaks if a trackable's kind were ever changed.

`scheduled` separates the two ideas so they don't bleed together:

- **Scheduled kinds** (`habit`) carry a cadence, appear in "due today", and earn
  a streak (§3).
- **Unscheduled kinds** (the metrics) have no cadence, no "due", no streak — you
  log a number whenever you take a reading, and the module charts the trend.

The stored `kind` is a plain string. If a kind key is ever removed from the
registry, the module falls back to default (`boolean`, generic icon, unscheduled)
rendering rather than erroring — kinds are additive and forgiving, as in lists.

## 2. Scope & sharing

The one `habits_trackable` table has a **member-chosen** Scope Policy (ADR-0004),
**defaulting to Private**: the owning member picks Private / Participants / Family
per trackable and may change it later. Health data is private by default so
nothing is shared by accident; a member can opt an individual trackable into a
shared surface.

**Sharing is visibility only — logging is always the owner's.** This is the key
way habits differs from lists, and it follows from a habit being *personal* even
when visible:

- **The owner** is the only member who can log check-ins/values, edit the
  trackable, change its Scope or cadence, manage participants, archive it, or
  delete it.
- **Any member who can *see* a trackable** (Family, or a Participant on it) sees
  its history and streak **read-only** — for encouragement and accountability,
  not to log on someone else's behalf.

A "family drink-water challenge" is therefore **N personal habits**, one per
member, each set to Family scope so everyone sees everyone's streak — *not* one
shared counter many people increment. Ownership stays clean and each streak
belongs to exactly one person.

### Visibility rules (RLS)

Scope enforcement is RLS-only (ADR-0004) using the canonical member-chosen
templates from ADR-0007. In plain terms:

- **`habits_trackable` SELECT** — visible when: you are the owner; OR scope is
  `family`; OR scope is `participants` and you have a row in
  `habits_participant`. (Private is owner-only, covered by the owner clause.)
- **`habits_trackable` INSERT / UPDATE / DELETE** — owner only. (Create, rename,
  cadence changes, scope changes, participant changes, archive, delete.)
- **`habits_log` SELECT** — allowed when you can SELECT the parent
  `habits_trackable` row (so a viewer sees the streak).
- **`habits_log` INSERT / UPDATE / DELETE** — **owner of the parent trackable
  only.** Unlike `lists_item` (whose writes ride on visibility), log writes do
  **not** follow "see it → edit it": only the owner logs their own habit.
- **`habits_participant`** — the owner of the referenced trackable manages its
  rows; SELECT follows parent-trackable visibility.

## 3. Cadence, "due today", and streaks

Only **scheduled** kinds (`habit`) use this section; metrics skip it entirely.

Each scheduled trackable declares a **cadence** — what "keeping up with it" means:

| cadence type | extra field       | "due" on…                    | streak counts…                       |
| ------------ | ----------------- | ---------------------------- | ------------------------------------ |
| `daily`      | —                 | every day                    | consecutive days done                |
| `weekly`     | `target` (N/week) | every day until N met that week | consecutive **weeks** the target was met |
| `weekdays`   | `weekdays` set    | the listed weekdays          | consecutive **scheduled days** done  |

- **Due today** — the module lists every scheduled trackable owned by the current
  member that is due today and not yet logged done. This is what the widget
  summarizes and the module's home view presents for one-tap check-off.
- **Streak** — the current run of met periods counting backward from today,
  **derived at read time** from `habits_log` (not stored), exactly as lists
  derives its unchecked-item count rather than storing it. A missed scheduled
  period breaks the streak.

Cadence lives in columns, not free JSON, so RLS and queries stay simple:
`cadence_type` (`daily` | `weekly` | `weekdays`), `cadence_target` (int, for
`weekly`), `cadence_weekdays` (smallint[] of ISO weekday numbers, for
`weekdays`). Unscheduled kinds leave all three null.

## 4. Log lifecycle

A **log** is one dated entry under a trackable: `{ date, done, value, note }`,
**one per trackable per day** (unique `(trackable_id, log_date)`).

- **Log today** — a `boolean` habit sets `done = true`; a `number` metric writes
  `value`. Re-logging the same day **upserts** the single row for that date.
- **Un-log / correct** — clear `done` back to false, edit a `value`, or delete the
  day's row.
- **Backfill** — the owner may log a past date (you forgot to check off
  yesterday). Any date is allowed; today is the default the UI opens on.
- **`note`** — an optional short text on a log entry (why the weight jumped, a
  workout detail). Nullable, no separate history.

Deletes of a single log entry are hard. Archival lives at the **trackable**
level, mirroring lists:

- **Archive a trackable** (owner) — soft: sets `archived_at`, hiding it from the
  active view, "due today", and the widget while keeping all history recoverable.
- **Delete a trackable** (owner) — removes the trackable and all its logs
  (cascade).

## 5. Data model

One `public` schema, slug-prefixed tables (ADR-0006). Hand-written migration
(ADR-0008); generated types land in `types/database.ts`.

**`habits_trackable`**

| column             | type          | notes                                             |
| ------------------ | ------------- | ------------------------------------------------- |
| `id`               | uuid pk       |                                                   |
| `owner_member_id`  | uuid          | the owning member                                 |
| `title`            | text          | required                                          |
| `kind`             | text          | a registry key; free string, forgiving            |
| `scope`            | `scope` enum  | member-chosen: `private`/`participants`/`family`  |
| `cadence_type`     | text          | `daily`/`weekly`/`weekdays`; null for metrics     |
| `cadence_target`   | integer       | N per week for `weekly`; else null                |
| `cadence_weekdays` | smallint[]    | ISO weekday numbers for `weekdays`; else null     |
| `archived_at`      | timestamptz   | null = active                                     |
| `created_at`       | timestamptz   |                                                   |
| `updated_at`       | timestamptz   |                                                   |

**`habits_log`**

| column          | type        | notes                                       |
| --------------- | ----------- | ------------------------------------------- |
| `id`            | uuid pk     |                                             |
| `trackable_id`  | uuid fk     | → `habits_trackable`, cascade delete        |
| `log_date`      | date        | the day this entry is for                   |
| `done`          | boolean     | default `false`; used by `boolean` kinds    |
| `value`         | numeric     | used by `number` kinds; null otherwise      |
| `note`          | text        | optional                                    |
| `created_at`    | timestamptz |                                             |

Unique `(trackable_id, log_date)` — one entry per trackable per day (the upsert
key).

**`habits_participant`** — the Participants-scope join table (ADR-0007 pattern)

| column          | type    | notes                                |
| --------------- | ------- | ------------------------------------ |
| `trackable_id`  | uuid fk | → `habits_trackable`, cascade delete |
| `member_id`     | uuid    | a participating (viewing) member     |

Primary key `(trackable_id, member_id)`. Rows exist only for `participants`-scope
trackables; ignored otherwise. A participant is a **viewer**, not a co-logger
(§2).

The `scope` enum is the shared platform enum from ADR-0007, not a habits-local
type.

## 6. Module Manifest

Code-first typed manifest (ADR-0001), registered in `modules/index.ts`.

- **Identity** — name "Habits", slug `habits`, icon, description.
- **Scopes (informational, per ADR-0004)** — `habits_trackable`: member-chosen;
  `habits_log`: inherits the parent trackable's visibility for SELECT, owner-only
  for writes; `habits_participant`: participant join. This declaration is a
  truthful catalog label; RLS is the only enforcement.
- **Widgets** — one (below).
- **`profileSections: []`** — none in v1.

## 7. Widget: Habits

One Widget (ADR-0005): a zero-prop React Server Component about the current
member, rendered inside the platform card frame. Read-only, matching the My Lists
precedent — tapping opens the module to actually check things off.

- **Shows** — for the current member's **own** scheduled habits, today's progress
  as a count ("2 of 4 done today"), plus a short row of the top current streaks
  (highest first, e.g. "🔥 Vitamins 12  🔥 Exercise 4"). Excludes archived
  trackables. Metrics are not shown in the widget; they're logged in-module.
- **Empty state** — when the member has no scheduled habits, a gentle prompt to
  add one.
- Fetches its own data via the module's `queries.ts` and the platform
  current-member helper; the dashboard passes it nothing (ADR-0005).
- Uniform v1 card size; no size variants (ADR-0005).

## 8. Deferred / out of scope

Consciously left for later so v1 stays a personal, per-member tracker:

- **Shared/co-logged trackables** — a single counter multiple members increment.
  v1's sharing is visibility-only; a shared challenge is N personal Family-scope
  habits (§2).
- **Reminders / notifications** — "you haven't logged today". No push in v1
  (PWA offline/notifications deferred platform-wide, map #1).
- **Reminders of metric goals / targets beyond streaks** — e.g. "reach 70 kg".
  Metrics chart a trend only in v1.
- **Per-kind rich fields** — sets/reps for a workout, sleep quality, mood scales.
  Added with the kind that needs them, via a migration then.
- **Profile section** — surfacing a member's Family-scope streaks on their
  profile; revisit after v1 (the plumbing — Family scope + read-only viewer RLS —
  is already here).
- **Sub-daily logging** — more than one entry per day (multiple weigh-ins). v1 is
  one entry per day (§4).
- **Widget size variants** — deferred platform-wide (ADR-0005).

## 9. Defaults worth noting

Not separate decisions — sensible defaults recorded so they aren't re-litigated:

- **Title required.** Kind chosen at creation; because the base model is shared,
  changing kind never migrates data (as in lists).
- **New trackables default to Private** and, for the `habit` kind, **`daily`
  cadence** — the least-surprising starting point; both editable.
- **Re-logging a day upserts** the single `(trackable, date)` row rather than
  appending — there is one truth per day.
- **Streaks and "due today" are derived at read time**, never stored, so history
  edits/backfills recompute them for free.
- A member who owns a Participants trackable always sees it; the participant list
  need not include the owner.
