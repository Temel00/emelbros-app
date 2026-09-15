/**
 * Pure view-logic for the shopping list screen (wayfinder #120), split out
 * of `shopping-list-view.tsx` so it can be unit tested without a component
 * harness (this repo's vitest config runs pure-logic tests only, `environment:
 * "node"`, no DOM — see vitest.config.ts).
 */

import { groupByLocation } from "@/modules/nutrition/lib/grouping";
import type { PantryLocation } from "@/modules/nutrition/lib/locations";
import type { ShoppingListShortfall } from "@/modules/nutrition/lib/shopping-list-generation";
import type {
  PantryItemWithFood,
  ShoppingListItemRow,
} from "@/modules/nutrition/queries";

export type ShoppingListGroup = {
  location: PantryLocation;
  items: ShoppingListItemRow[];
};

export type ShoppingListGrouping = {
  grouped: ShoppingListGroup[];
  /** Lines with no linked food, or a linked food not currently in the pantry. */
  notInPantry: ShoppingListItemRow[];
};

/** `2 kg` / `1.5 each` / just the unit if there's no quantity yet. */
export function formatQuantity(
  quantity: number | null,
  unit: string | null,
): string {
  if (quantity === null) return unit ?? "";
  return unit ? `${Number(quantity)} ${unit}` : String(Number(quantity));
}

/**
 * Groups shopping-list lines by the pantry location their linked food is
 * stocked in. The list has no `location` of its own (unlike a pantry item —
 * a line can name a food the household has never stocked), so each line's
 * location is derived from the first pantry row for that food; when a food
 * has several pantry rows (e.g. one open, one backup) in different spots,
 * the first one wins rather than trying to merge or pick the "right" one.
 * Lines with no linked food, or whose food has no pantry row at all, land in
 * `notInPantry` instead of a synthetic location.
 */
export function groupShoppingListItems(
  items: readonly ShoppingListItemRow[],
  pantryItems: readonly PantryItemWithFood[],
): ShoppingListGrouping {
  const locationByFood = new Map<string, string>();
  for (const pantryItem of pantryItems) {
    if (!locationByFood.has(pantryItem.food_id)) {
      locationByFood.set(pantryItem.food_id, pantryItem.location);
    }
  }

  const withLocation: { location: string; item: ShoppingListItemRow }[] = [];
  const notInPantry: ShoppingListItemRow[] = [];

  for (const item of items) {
    const location = item.food_id ? locationByFood.get(item.food_id) : undefined;
    if (location) withLocation.push({ location, item });
    else notInPantry.push(item);
  }

  const grouped = groupByLocation(withLocation).map((group) => ({
    location: group.location,
    items: group.items.map(({ item }) => item),
  }));

  return { grouped, notInPantry };
}

export type AutoLineDiff = {
  added: ShoppingListShortfall[];
  changed: { previous: ShoppingListItemRow; next: ShoppingListShortfall }[];
  removed: ShoppingListItemRow[];
};

function autoLineKey(foodId: string | null, unit: string | null): string {
  return `${foodId}::${unit}`;
}

/**
 * What confirming Generate would change: the list's current `auto` lines
 * against a freshly previewed set of shortfalls, matched the same way
 * `replaceAutoShoppingListItems` matches them for real — by food + unit,
 * since v1 does no unit conversion.
 */
export function diffAutoLines(
  currentItems: readonly ShoppingListItemRow[],
  pending: readonly ShoppingListShortfall[],
): AutoLineDiff {
  const currentAuto = currentItems.filter((item) => item.source === "auto");
  const currentByKey = new Map(
    currentAuto.map((item) => [autoLineKey(item.food_id, item.unit), item]),
  );
  const pendingByKey = new Map(
    pending.map((line) => [autoLineKey(line.foodId, line.unit), line]),
  );

  const added: ShoppingListShortfall[] = [];
  const changed: AutoLineDiff["changed"] = [];
  for (const [key, line] of pendingByKey) {
    const existing = currentByKey.get(key);
    if (!existing) added.push(line);
    else if (existing.quantity !== line.quantity)
      changed.push({ previous: existing, next: line });
  }

  const removed = currentAuto.filter(
    (item) => !pendingByKey.has(autoLineKey(item.food_id, item.unit)),
  );

  return { added, changed, removed };
}

export function isEmptyDiff(diff: AutoLineDiff): boolean {
  return (
    diff.added.length === 0 &&
    diff.changed.length === 0 &&
    diff.removed.length === 0
  );
}

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** A plain CSV a member can paste into a notes app or another list. */
export function shoppingListToCsv(
  items: readonly ShoppingListItemRow[],
): string {
  const header = "quantity,unit,item,checked";
  const rows = items.map((item) =>
    [
      item.quantity ?? "",
      item.unit ?? "",
      csvField(item.display_text),
      item.checked_off ? "yes" : "no",
    ].join(","),
  );
  return [header, ...rows].join("\n");
}
