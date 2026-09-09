import { moveItem } from "@/lib/reorder";

/**
 * Ordering math for a recipe's ingredient lines
 * (docs/modules/nutrition.md §3.3, §4). A recipe is an *ordered* list, and
 * `nutrition_recipe_ingredient.position` is what carries that order.
 *
 * Positions are contiguous zero-based indices, the same convention
 * `lists_item` uses: the editor hands back the full id order and the write
 * layer stores each id's array index, so there is never a gap to reason
 * about and no fractional-rank scheme to maintain.
 */

/** The position a newly appended line takes: after every existing line. */
export function nextIngredientPosition(existing: unknown[]): number {
  return existing.length;
}

/**
 * The id order after nudging one line up or down by a single place.
 *
 * The swap itself is the platform's shared `moveItem` (#27), which already
 * treats a move off either end as a no-op. This wrapper exists to work in
 * ingredient **ids** rather than array indices, because that is what the
 * editor and the write layer hold — and so a stale click on a line another
 * member has just deleted reshuffles nothing.
 */
export function moveIngredient(
  order: readonly string[],
  id: string,
  direction: "up" | "down",
): string[] {
  const index = order.indexOf(id);
  if (index === -1) return [...order];

  return moveItem([...order], index, direction);
}
