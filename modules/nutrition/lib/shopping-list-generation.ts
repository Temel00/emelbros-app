/**
 * Shopping-list generation math (docs/modules/nutrition.md §3.4, §8, #118's
 * scope). Generating the shopping list for a date range sums each planned
 * recipe's linked ingredients (scaled to servings planned), subtracts
 * what's already in the pantry, and returns the shortfall as lines to
 * write — this is the pure part of that; the action only reads the plan
 * and pantry and writes the result.
 *
 * A line only participates when it's linked to a food, has a quantity and
 * unit, and the pantry holds a row for that food in the *same* unit — v1
 * does no unit conversion (§8), so an unlinked line, a food with no pantry
 * row at all, and a food whose only pantry row is in a different unit all
 * contribute nothing (a member can still add any of these as a `manual`
 * line). The same food across several planned recipes sums into one
 * shortfall line, not one per recipe. A pantry row that already covers the
 * full planned amount emits no line at all — the shortfall must be
 * strictly positive.
 */

import { ingredientRollupText } from "@/modules/nutrition/lib/recipe-ingredient";

export type PlannedIngredientLine = {
  foodId: string | null;
  foodName: string;
  quantity: number | null;
  unit: string | null;
};

export type PlannedEntryForGeneration = {
  recipeServings: number;
  servingsPlanned: number;
  lines: readonly PlannedIngredientLine[];
};

export type PantryRowForGeneration = {
  foodId: string;
  quantity: number;
  unit: string;
};

export type ShoppingListShortfall = {
  foodId: string;
  displayText: string;
  quantity: number;
  unit: string;
};

/**
 * The scale factor for a planned entry: servings planned over what the
 * recipe's ingredient quantities are written for.
 */
function servingsScale(recipeServings: number, servingsPlanned: number) {
  return servingsPlanned / recipeServings;
}

type NeededAmount = {
  foodId: string;
  foodName: string;
  unit: string;
  quantity: number;
};

/**
 * Sums every planned entry's linked, quantified lines by `{ foodId, unit }`
 * — the same food in two different units needs is tracked separately,
 * since v1 has nothing that relates them (§8).
 */
function sumNeededAmounts(
  entries: readonly PlannedEntryForGeneration[],
): Map<string, NeededAmount> {
  const needed = new Map<string, NeededAmount>();

  for (const entry of entries) {
    const scale = servingsScale(entry.recipeServings, entry.servingsPlanned);

    for (const line of entry.lines) {
      if (line.foodId === null || line.quantity === null || line.unit === null)
        continue;

      const key = `${line.foodId}::${line.unit}`;
      const amount = line.quantity * scale;
      const existing = needed.get(key);

      if (existing) {
        existing.quantity += amount;
      } else {
        needed.set(key, {
          foodId: line.foodId,
          foodName: line.foodName,
          unit: line.unit,
          quantity: amount,
        });
      }
    }
  }

  return needed;
}

/**
 * Finds the pantry row a need is diffed against: same food, same unit (no
 * conversion, §8).
 */
function matchingPantryRow(
  need: NeededAmount,
  pantryRows: readonly PantryRowForGeneration[],
): PantryRowForGeneration | undefined {
  return pantryRows.find(
    (row) => row.foodId === need.foodId && row.unit === need.unit,
  );
}

export function computeShoppingListShortfalls(
  entries: readonly PlannedEntryForGeneration[],
  pantryRows: readonly PantryRowForGeneration[],
): ShoppingListShortfall[] {
  const needed = sumNeededAmounts(entries);
  const shortfalls: ShoppingListShortfall[] = [];

  for (const need of needed.values()) {
    const pantryRow = matchingPantryRow(need, pantryRows);
    if (!pantryRow) continue;

    const shortfall = need.quantity - pantryRow.quantity;
    if (shortfall <= 0) continue;

    shortfalls.push({
      foodId: need.foodId,
      displayText: ingredientRollupText(shortfall, need.unit, need.foodName),
      quantity: shortfall,
      unit: need.unit,
    });
  }

  return shortfalls;
}
