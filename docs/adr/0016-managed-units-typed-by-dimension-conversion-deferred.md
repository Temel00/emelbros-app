# Managed units are typed by dimension; conversion engine deferred

Pantry/food/recipe/shopping units become a single household-managed **unit list** (constrained, DB-backed), and every unit is tagged with a **dimension** (`weight` / `volume` / `count`). v1 records the dimension but ships **no conversion engine**: a quantity's macros compute only when its unit equals the food's **base unit**, and any mismatch is detected and flagged rather than converted. We tag the dimension now because it is cheap, cleans up the dropdown, and future-proofs the schema; we defer the engine because it carries real cost (factor tables, canonical-unit-per-dimension, rounding/display) for thin v1 value — the mismatches that actually bite (recipe "cup" vs food basis "g") are cross-dimension and need per-ingredient density, which is further out still.

Decided while resolving [#147](https://github.com/Temel00/emelbros-app/issues/147) under map [#146](https://github.com/Temel00/emelbros-app/issues/146). Keeps the "no unit conversion" deferral of `docs/modules/nutrition.md` §8 intact.

## Considered options

- **Labels only (no dimension).** Simplest, but throws away the structure needed for any future conversion and can't distinguish a mismatch from a match.
- **Two vocabularies (base unit vs purchase/display unit).** Rejected: only pays off with a conversion engine, which is exactly what v1 defers.
- **Ship intra-family conversion now.** Rejected for v1: real engine cost, and delivers little until cross-family (density) conversion also exists.

## Consequences

- The units table needs a `dimension` column from day one; a future conversion engine is an additive change, not a migration.
- The existing "assume matching units" behavior is replaced by **detect-and-flag**: a linked line whose unit differs from the food's base unit contributes no macros and is marked, instead of silently computing a wrong number.
- Unit conversion (intra-family, and cross-family via density) is a separate future effort with its own map and ADR — out of scope for map #146.
