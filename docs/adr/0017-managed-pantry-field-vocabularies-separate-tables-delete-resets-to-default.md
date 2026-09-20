# Managed pantry-field vocabularies: separate DB tables, FK by stable key, delete resets to a protected default

Pantry **location** and **unit** stop being in-code registries (`modules/nutrition/lib/locations.ts`, freeform `text` columns) and become **DB-backed managed vocabularies** members edit from a settings surface. Each is its own table — `nutrition_pantry_location` and `nutrition_unit` — not one generic `kind`-discriminated `nutrition_pantry_setting`, because the two entities share almost no columns (a unit carries a `dimension` and governs four tables app-wide; a location carries an `icon` and belongs only to pantry items). Both are **global**: the app is a single fixed-Family tenant (ADR-0004) with no household entity, so the lists carry no scope column, exactly like the other nutrition tables.

Decided while resolving [#148](https://github.com/Temel00/emelbros-app/issues/148) under map [#146](https://github.com/Temel00/emelbros-app/issues/146). Builds on the managed-units decision [ADR-0016](0016-managed-units-typed-by-dimension-conversion-deferred.md) / [#147](https://github.com/Temel00/emelbros-app/issues/147).

## Decision

- **Two tables.** `nutrition_pantry_location` (`key, label, icon, sort_order, active`) and `nutrition_unit` (`key, label, dimension NOT NULL, sort_order, active`). Personalization beyond this (color, default expiry, a user-configurable default) is deferred.
- **Reference by stable text `key`, via foreign key.** Referencing columns (`nutrition_pantry_item.location`, and the unit columns on food/pantry/recipe/shopping) become FKs to the vocabulary table's unique `key`. Keys are **immutable** once created; user-added rows get a generated slug. FK integrity replaces the old forgiving `fallbackLocation` — an unknown key can no longer be stored.
- **Removal is archive or delete.** `active = false` retires a row from pickers without touching rows already referencing it. Hard delete removes the row and **resets referencers to the default** via `ON DELETE SET DEFAULT`.
- **A protected, seeded default row per table** — location `fridge`, unit `g` — that cannot be deleted, so `SET DEFAULT` always has a target. The default is a fixed system row for v1, not member-configurable.
- **Delete is asymmetric to protect macro integrity.** `nutrition_food.unit` is the base unit a food's macros are stated per, so its FK is `ON DELETE RESTRICT` (a unit in use as any food's base unit can't be deleted; reassign first). The pantry/recipe/shopping unit fields and the pantry location field are `ON DELETE SET DEFAULT`, where a reset is harmless (ADR-0016 already detects and flags a unit that differs from the food's base unit).
- **RLS: fixed-Family** (`auth.uid() is not null` for all ops), like every other nutrition table — any signed-in member can add, rename, archive, or delete a unit or location.

## Considered options

- **One generic `nutrition_pantry_setting` (kind = location | unit).** Rejected: half its columns (`dimension`, `icon`) are always null for half the rows, and it can't make `dimension` NOT NULL.
- **Keep verbatim `text` keys, validate only in the UI.** Rejected: gives up DB integrity and the declarative reset; "managed and constrained" (#147) is exactly the promise a FK keeps.
- **Soft-archive only, never delete.** Rejected: members want a real cleanup that resets stray references, not just a growing pile of hidden rows. Archive is kept *alongside* delete for the retire-without-disturbing case.
- **`SET DEFAULT` everywhere, including `nutrition_food.unit`.** Rejected: silently rebasing a food's macros to `g` corrupts its nutrition facts; `RESTRICT` there forces an explicit reassignment.

## Consequences

- New tables + FKs are a migration ([#150](https://github.com/Temel00/emelbros-app/issues/150)), which also clean-slate seeds the curated unit list (ADR-0016) and the current location registry, and marks the protected default rows. The undeletable-default guard is enforced in that migration (trigger or protected flag).
- `modules/nutrition/lib/locations.ts` and the `fallbackLocation` path are retired once locations are DB-backed; `location-icon.tsx` still resolves the stored Lucide `icon` name.
- The editing surface ([#149](https://github.com/Temel00/emelbros-app/issues/149)) edits both tables; a user-configurable default and richer personalization (color, default expiry) are a later effort that graduates from map #146's fog.
