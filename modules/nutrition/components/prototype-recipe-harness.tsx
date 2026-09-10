/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #113 resolves.
 *
 * The recipe box + recipe editor, on the throwaway
 * `/nutrition/recipe-prototype` route. Round 2 settled on a single
 * direction (spreadsheet box, Option B's sectioned editor + cook mode,
 * food-first ingredient linking) — see prototype-recipe-variant-e.tsx for
 * the verdict. No more `?variant=` switching: this is the answer, not one
 * of several options anymore.
 */

import type { FoodRow } from "@/modules/nutrition/queries";
import { mockRecipes } from "./prototype-recipe-data";
import { VariantE } from "./prototype-recipe-variant-e";

export function PrototypeRecipeHarness({ foods }: { foods: FoodRow[] }) {
  const linkFirstTwoTo = foods.slice(0, 2).map((f) => f.id);
  const recipes = mockRecipes(linkFirstTwoTo);

  return <VariantE recipes={recipes} foods={foods} />;
}
