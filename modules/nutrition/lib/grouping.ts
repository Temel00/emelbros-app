import type { PantryLocationRow } from "@/modules/nutrition/queries";

/**
 * The display shape a group header needs: the stored `key` to group on, plus
 * the `label`/`icon` to render. A `Pick` of the managed row (ADR-0017) so a
 * caller can hand us `getPantryLocations()` rows directly, and the fallback
 * group for a stored key no longer in the managed list still satisfies it.
 */
export type GroupLocation = Pick<PantryLocationRow, "key" | "label" | "icon">;

export type PantryGroup<T> = { location: GroupLocation; items: T[] };

/**
 * Groups pantry lines for display (docs/modules/nutrition.md §3.2). Groups
 * come back in the managed order the caller passes (`getPantryLocations()`,
 * ordered by `sort_order`) so the pantry reads the same way every time, with
 * any location no longer in that list appended after — a stored key never
 * makes a row vanish (§10). Empty managed locations are dropped: an empty
 * "Freezer" heading is noise, not information.
 *
 * Item order within a group is whatever the caller passed in, so the
 * query's expiry ordering survives.
 */
export function groupByLocation<T extends { location: string }>(
  items: T[],
  locations: readonly GroupLocation[],
): PantryGroup<T>[] {
  const byKey = new Map<string, T[]>();
  for (const item of items) {
    const group = byKey.get(item.location);
    if (group) group.push(item);
    else byKey.set(item.location, [item]);
  }

  const byLocationKey = new Map(locations.map((loc) => [loc.key, loc]));
  const knownKeys = locations.map((loc) => loc.key);
  const unknownKeys = [...byKey.keys()].filter((key) => !byLocationKey.has(key));

  return [...knownKeys, ...unknownKeys]
    .filter((key) => byKey.has(key))
    .map((key) => ({
      // A stored key outside the managed list (archived, or since removed)
      // still renders — its own key as the label, a neutral icon.
      location: byLocationKey.get(key) ?? { key, label: key, icon: "Package" },
      items: byKey.get(key) ?? [],
    }));
}
