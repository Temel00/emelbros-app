/**
 * Display text for a `nutrition_log` row (nutrition.md §3.5, wayfinder
 * #123). The row itself carries only bare `food_id`/`recipe_id` links, no
 * denormalized name (§3.5, §10 — macros are snapshotted, but names never
 * were), so the day list resolves them against the already-fetched
 * `foods`/`recipes` lists.
 *
 * `recipes` is always the active-only list (`getRecipes` filters
 * `archived_at`) — an entry logged against a recipe that's since been
 * archived won't resolve, so this falls back to a generic label rather than
 * throwing or showing a blank row. Foods aren't archivable, but a food
 * could in principle have been removed, so the same fallback applies there
 * too, for the same reason.
 */
import type {
  FoodRow,
  LogEntryRow,
  MealPlanEntryWithRecipe,
  RecipeRow,
} from "@/modules/nutrition/queries";

export type LogEntrySource = "recipe" | "food" | "freeform";

export function logEntrySource(entry: LogEntryRow): LogEntrySource {
  if (entry.recipe_id !== null) return "recipe";
  if (entry.food_id !== null) return "food";
  return "freeform";
}

export function logEntryDisplayText(
  entry: LogEntryRow,
  foods: readonly FoodRow[],
  recipes: readonly RecipeRow[],
): string {
  if (entry.recipe_id !== null) {
    const recipe = recipes.find((candidate) => candidate.id === entry.recipe_id);
    return recipe?.title ?? "Recipe (no longer available)";
  }
  if (entry.food_id !== null) {
    const food = foods.find((candidate) => candidate.id === entry.food_id);
    if (!food) return "Food (no longer available)";
    return food.brand ? `${food.name} (${food.brand})` : food.name;
  }
  return entry.description ?? "Untitled entry";
}

/** The one-line detail shown under the display text — portion, quantity+unit, or nothing for freeform. */
export function logEntryDetail(entry: LogEntryRow): string | null {
  if (entry.recipe_id !== null) {
    const portion = entry.quantity ?? 1;
    return portion === 1 ? "1× planned portion" : `${portion}× planned portion`;
  }
  if (entry.food_id !== null) {
    if (entry.quantity === null) return entry.unit;
    return entry.unit ? `${entry.quantity} ${entry.unit}` : `${entry.quantity}`;
  }
  return null;
}

/**
 * Today's plan entries the Cooked tab can offer to log (nutrition.md §3.5).
 * `logCookedMealEntryAction` requires `cooked_at` to already be set, so
 * showing an entry the action would reject just to fail on tap is worse
 * than narrowing the pick-list up front — a deliberate deviation from the
 * prototype's `CookedPanel`, which showed all of today's plan regardless of
 * cooked state.
 */
export function loggableCookedPlanEntries(
  entries: readonly MealPlanEntryWithRecipe[],
): MealPlanEntryWithRecipe[] {
  return entries.filter(
    (entry) => entry.cooked_at !== null && entry.recipe !== null,
  );
}

export type LogMacros = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

/**
 * Scales a recipe- or food-sourced entry's own snapshotted macros to a new
 * quantity (edit dialog, portion/quantity change). This scales the entry's
 * *own* already-snapshotted rate — it never re-fetches the linked
 * food/recipe's current numbers, so it doesn't violate the
 * snapshot-never-recomputed rule (§3.5, §10) that `updateLogEntryAction`
 * itself relies on. A zero (or missing) base quantity has no rate to scale
 * from, so it returns the entry's macros unchanged rather than dividing by
 * zero.
 */
export function scaleLogMacros(
  entry: Pick<LogEntryRow, "quantity" | "calories" | "protein_g" | "carbs_g" | "fat_g">,
  newQuantity: number,
): LogMacros {
  const baseQuantity = entry.quantity ?? 1;
  const ratio = baseQuantity === 0 ? 1 : newQuantity / baseQuantity;
  const scale = (value: number | null) => Math.round((value ?? 0) * ratio);
  return {
    calories: scale(entry.calories),
    proteinG: scale(entry.protein_g),
    carbsG: scale(entry.carbs_g),
    fatG: scale(entry.fat_g),
  };
}
