import { Suspense } from "react";

import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import { PrototypeMealPlanHarness } from "@/modules/nutrition/components/prototype-meal-plan-harness";
import { getRecipes } from "@/modules/nutrition/queries";

/**
 * PROTOTYPE ONLY — throwaway route. Delete when wayfinder #116 resolves.
 *
 * Three variants of the week-at-a-glance meal plan (nutrition.md §3.4),
 * switchable via `?variant=`, mounted in the same shell as the real
 * nutrition pages (same header, same nav) so the layout is judged against
 * real chrome, not a blank canvas. Its own route rather than a branch on
 * the (not-yet-existing) real meal-plan page — this prototype is what
 * decides what that page becomes, the same shape #113's recipe prototype
 * took for #114.
 *
 * Recipes come from the real `nutrition_recipe` table (read-only, via
 * `getRecipes`) so the assign flow has real titles to search; the plan
 * entries themselves are in-memory mock data — nothing here writes to
 * `nutrition_meal_plan_entry`.
 */
export default async function MealPlanPrototypePage() {
  const member = await getCurrentMember();
  if (!member) return null;

  const supabase = await createClient();
  const recipes = await getRecipes(supabase);

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 pb-24 sm:p-6">
        <div>
          <h1 className="text-xl font-semibold">Meal plan (prototype)</h1>
          <p className="text-sm text-muted-foreground">
            Three layout directions for the week-at-a-glance plan — flip
            between them with the bar at the bottom.
          </p>
        </div>

        <Suspense>
          <PrototypeMealPlanHarness recipes={recipes} />
        </Suspense>
      </main>
    </>
  );
}
