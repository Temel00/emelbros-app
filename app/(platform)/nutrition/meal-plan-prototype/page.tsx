import { Suspense } from "react";

import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import { PrototypeMealPlanHarness } from "@/modules/nutrition/components/prototype-meal-plan-harness";
import { getRecipes, type RecipeRow } from "@/modules/nutrition/queries";

/**
 * PROTOTYPE ONLY — throwaway route. Delete when wayfinder #116 resolves.
 *
 * Round 2: two compact-list directions for the week-at-a-glance plan
 * (nutrition.md §3.4), each with a month view too, switchable via
 * `?variant=`, mounted in the same shell as the real nutrition pages so
 * the layout is judged against real chrome, not a blank canvas. Its own
 * route rather than a branch on the (not-yet-existing) real meal-plan
 * page — this prototype is what decides what that page becomes, the same
 * shape #113's recipe prototype took for #114.
 *
 * Recipes come from the real `nutrition_recipe` table (read-only) so the
 * assign flow and the recipe quick-view have real titles/ingredient
 * counts to show, and "open full recipe" is a genuine link into the
 * shipped `/nutrition/recipes/[id]` page (#114) — the browser back button
 * is the way back, not a prototype illusion of one. Plan entries
 * themselves are in-memory mock data — nothing here writes to
 * `nutrition_meal_plan_entry`.
 */
export default async function MealPlanPrototypePage() {
  const member = await getCurrentMember();
  if (!member) return null;

  const supabase = await createClient();
  const recipes = await getRecipes(supabase);
  const recipeSummaries = await withIngredientCounts(supabase, recipes);

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 pb-24 sm:p-6">
        <div>
          <h1 className="text-xl font-semibold">Meal plan (prototype)</h1>
          <p className="text-sm text-muted-foreground">
            Two compact-list directions for the week-at-a-glance plan, each
            with week/month toggle — flip between them with the bar at the
            bottom.
          </p>
        </div>

        <Suspense>
          <PrototypeMealPlanHarness
            recipes={recipes}
            recipeSummaries={recipeSummaries}
          />
        </Suspense>
      </main>
    </>
  );
}

/**
 * Just enough per-recipe detail for the quick-view peek (servings + an
 * ingredient count) without pulling in the full food-joined shape
 * `getRecipe` returns for the real detail page.
 */
async function withIngredientCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recipes: RecipeRow[],
) {
  const { data, error } = await supabase
    .from("nutrition_recipe_ingredient")
    .select("recipe_id");
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data) {
    counts.set(row.recipe_id, (counts.get(row.recipe_id) ?? 0) + 1);
  }

  return recipes.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    servings: recipe.servings,
    ingredientCount: counts.get(recipe.id) ?? 0,
  }));
}
