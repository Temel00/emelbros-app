import { Suspense } from "react";

import { AppHeader } from "@/components/app-header";
import { PrototypeLogHarness } from "@/modules/nutrition/components/prototype-log-harness";
import {
  getFoods,
  getMealPlanEntries,
  getRecipes,
} from "@/modules/nutrition/queries";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";

/**
 * PROTOTYPE ONLY — throwaway route. Delete when wayfinder #122 resolves.
 *
 * Three variants of the nutrition-log page, switchable via `?variant=`, on
 * a new `/nutrition/log-prototype` route (no real page exists yet —
 * `nutrition_log`'s schema and query layer landed in #121, but the UI is
 * still unbuilt). Mounted in the real app shell so the owner judges it
 * against real chrome, not a blank canvas.
 *
 * Foods, recipes, and today's meal-plan entries come from the real tables
 * (read-only) so the three logging paths work against the owner's own
 * kitchen data. The log entries themselves — what's been logged today, at
 * what portion/quantity, with what macros — are in-memory mock data.
 * Nothing here reads or writes `nutrition_log`.
 */
export default async function NutritionLogPrototypePage() {
  const member = await getCurrentMember();
  if (!member) return null;

  const supabase = await createClient();
  const todayIso = new Date().toISOString().slice(0, 10);
  const [foods, recipes, mealPlanEntries] = await Promise.all([
    getFoods(supabase),
    getRecipes(supabase),
    getMealPlanEntries(supabase, todayIso, todayIso),
  ]);

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 pb-24 sm:p-6">
        <div>
          <h1 className="text-xl font-semibold">Log a meal (prototype)</h1>
          <p className="text-sm text-muted-foreground">
            Three takes on how a member logs what they ate: an explicit tabbed
            picker (Cooked / Food / Freeform), a unified search box with one-tap
            frequent chips, and today&rsquo;s plan as primary big buttons with
            an escape hatch for anything else. Each covers all three logging
            paths, an adjustable-portion cooked-meal shortcut, a rough-guess
            freeform entry, and a day list with edit/delete. Flip between them
            with the bar at the bottom.
          </p>
        </div>

        <Suspense>
          <PrototypeLogHarness
            foods={foods}
            recipes={recipes}
            mealPlanEntries={mealPlanEntries}
          />
        </Suspense>
      </main>
    </>
  );
}
