/**
 * The food-first ingredient-linking widget's text logic (nutrition.md §3.3,
 * wayfinder #113's resolution). Once a line is linked to a food, its
 * `display_text` is a generated rollup of amount + unit + food name rather
 * than an independently-typed field — this is the pure part of that
 * generation, kept separate from the component so the empty-parts cases are
 * easy to test.
 */

/**
 * `2 tbsp Olive oil` — joins whichever of quantity, unit and food name are
 * present. A quantity with no unit ("4 eggs") and a food with no quantity
 * yet (mid-edit, before an amount is typed) both need to read sensibly, so
 * each part is included only when it has something to say.
 */
export function ingredientRollupText(
  quantity: number | null,
  unit: string | null,
  foodName: string,
): string {
  return [quantity, unit, foodName]
    .filter((part) => part !== null && part !== "")
    .join(" ");
}
