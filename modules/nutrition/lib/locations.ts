/**
 * The pantry location registry (docs/modules/nutrition.md §3.2, §10) — the
 * module's designed-in extension point, in code rather than the database,
 * exactly the shape lists' `kind` and habits' `kind` use. Adding
 * `pantry-shelf-2` is appending an entry here, never a migration.
 */
export type PantryLocation = {
  /** Stored verbatim on `nutrition_pantry_item.location`. */
  key: string;
  label: string;
  /** Lucide icon name, resolved by `resolveIcon` (falls back if unknown). */
  icon: string;
};

const PANTRY_LOCATIONS: PantryLocation[] = [
  { key: "fridge", label: "Fridge", icon: "Refrigerator" },
  { key: "freezer", label: "Freezer", icon: "Snowflake" },
  { key: "pantry", label: "Pantry", icon: "Archive" },
  { key: "other", label: "Other", icon: "Package" },
];

/**
 * Default rendering for a stored `location` that isn't (or is no longer) in
 * the registry — locations are additive and forgiving, never a reason to
 * error. Keeps the stored key so the row still round-trips on edit.
 */
function fallbackLocation(key: string): PantryLocation {
  return { key, label: "Other", icon: "Package" };
}

export function pantryLocations(): PantryLocation[] {
  return PANTRY_LOCATIONS;
}

export function getPantryLocation(key: string): PantryLocation {
  return (
    PANTRY_LOCATIONS.find((loc) => loc.key === key) ?? fallbackLocation(key)
  );
}

/** The location new pantry items land in unless the member picks another. */
export const DEFAULT_PANTRY_LOCATION = PANTRY_LOCATIONS[0].key;
