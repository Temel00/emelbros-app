/**
 * Cook-decrements-pantry math (docs/modules/nutrition.md §3.4, §8, #115's
 * scope). Marking a plan entry cooked decrements matching pantry rows by
 * the recipe's linked ingredient quantities, scaled by servings actually
 * made over the recipe's own servings count. This is the pure part of
 * that: given the recipe's lines and the pantry's rows, it returns the
 * decrements to write — the action only applies them.
 *
 * A line is skipped (no decrement returned) when there's nothing to
 * decrement against: no food link, no quantity, or no pantry row for that
 * food in the *same* unit — v1 does no unit conversion (§8), so a
 * differently-unit'd row doesn't match. A line that *does* match but
 * doesn't have enough on hand still decrements — v1 does not block on
 * negative inventory (§3.4, §8); the resulting quantity can go negative
 * rather than being clamped or skipped.
 */

export type RecipeLineForDecrement = {
  foodId: string | null;
  quantity: number | null;
  unit: string | null;
};

export type PantryRowForDecrement = {
  id: string;
  foodId: string;
  quantity: number;
  unit: string;
};

export type PantryDecrement = {
  pantryItemId: string;
  quantity: number;
};

/**
 * The scale factor for a cook: servings actually made over what the
 * recipe's ingredient quantities are written for.
 */
function servingsScale(recipeServings: number, servingsPlanned: number) {
  return servingsPlanned / recipeServings;
}

/**
 * Finds the pantry row a line decrements against: same food, same unit
 * (no conversion, §8). When more than one pantry row matches, the first
 * is used — splitting a decrement across several rows of the same food is
 * out of scope for v1 (judgment call, flagged in the PR).
 */
function matchingPantryRow(
  line: RecipeLineForDecrement,
  pantryRows: readonly PantryRowForDecrement[],
): PantryRowForDecrement | undefined {
  return pantryRows.find(
    (row) => row.foodId === line.foodId && row.unit === line.unit,
  );
}

export function computeCookDecrements(
  recipeServings: number,
  servingsPlanned: number,
  lines: readonly RecipeLineForDecrement[],
  pantryRows: readonly PantryRowForDecrement[],
): PantryDecrement[] {
  const scale = servingsScale(recipeServings, servingsPlanned);
  const decrements: PantryDecrement[] = [];

  for (const line of lines) {
    if (line.foodId === null || line.quantity === null) continue;

    const pantryRow = matchingPantryRow(line, pantryRows);
    if (!pantryRow) continue;

    decrements.push({
      pantryItemId: pantryRow.id,
      quantity: pantryRow.quantity - line.quantity * scale,
    });
  }

  return decrements;
}
