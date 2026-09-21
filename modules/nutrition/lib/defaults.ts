/**
 * The fixed default keys for the two managed pantry-field vocabularies
 * (ADR-0017). These are the protected, always-present seed rows that
 * `ON DELETE SET DEFAULT` resets to, so v1 has no user-configurable default —
 * the default *is* the protected row.
 *
 * Published here as the single source of truth. Consumers (`actions.ts`'s old
 * `DEFAULT_PANTRY_LOCATION`, the bare `"g"` in `food-link-picker.tsx`) are
 * rewired to import these in the pantry-retirement ticket (#158) — this
 * module only publishes them.
 */
export const DEFAULT_UNIT_KEY = "g";
export const DEFAULT_LOCATION_KEY = "fridge";

/**
 * The dimensions a managed unit can carry (ADR-0016), mirroring the DB check
 * on `nutrition_unit.dimension`. Conversion between units of the same
 * dimension is deferred (ADR-0016); the dimension only tags and groups units.
 */
export const UNIT_DIMENSIONS = ["weight", "volume", "count"] as const;
export type UnitDimension = (typeof UNIT_DIMENSIONS)[number];
