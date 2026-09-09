import {
  getPantryLocation,
  pantryLocations,
  type PantryLocation,
} from "@/modules/nutrition/lib/locations";

export type PantryGroup<T> = { location: PantryLocation; items: T[] };

/**
 * Groups pantry lines for display (docs/modules/nutrition.md §3.2). Groups
 * come back in registry order so the pantry reads the same way every time,
 * with any location no longer in the registry appended after — a stored key
 * never makes a row vanish (§10). Empty registry locations are dropped:
 * an empty "Freezer" heading is noise, not information.
 *
 * Item order within a group is whatever the caller passed in, so the
 * query's expiry ordering survives.
 */
export function groupByLocation<T extends { location: string }>(
  items: T[],
): PantryGroup<T>[] {
  const byKey = new Map<string, T[]>();
  for (const item of items) {
    const group = byKey.get(item.location);
    if (group) group.push(item);
    else byKey.set(item.location, [item]);
  }

  const registryKeys = pantryLocations().map((loc) => loc.key);
  const unknownKeys = [...byKey.keys()].filter(
    (key) => !registryKeys.includes(key),
  );

  return [...registryKeys, ...unknownKeys]
    .filter((key) => byKey.has(key))
    .map((key) => ({
      location: getPantryLocation(key),
      items: byKey.get(key) ?? [],
    }));
}
