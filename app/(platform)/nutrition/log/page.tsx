import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";

import { FolderCard } from "@/modules/nutrition/components/folder-card";
import { LogView } from "@/modules/nutrition/components/log-view";
import { todayIso } from "@/modules/nutrition/lib/plan-calendar";
import {
  getFoods,
  getLogEntries,
  getMealPlanEntries,
  getRecipes,
} from "@/modules/nutrition/queries";

/**
 * The logging view (nutrition.md §3.5, wayfinder #123): today's log for the
 * current member, and the three ways to add to it settled by the prototype
 * (#122, Variant A "Tabbed entry"). `nutrition_log` is fixed Private (§2,
 * §10) — unlike the other nutrition pages, this one is the caller's own
 * data, not the whole household's.
 */
export default async function NutritionLogPage() {
  const member = await getCurrentMember();
  // The proxy (ADR-0011) redirects signed-out requests to /sign-in before
  // this component ever runs.
  if (!member) return null;

  const supabase = await createClient();
  const today = todayIso();
  const [foods, recipes, todaysPlan, entries] = await Promise.all([
    getFoods(supabase),
    getRecipes(supabase),
    getMealPlanEntries(supabase, today, today),
    getLogEntries(supabase, today, today),
  ]);

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-4 sm:p-6">
        <FolderCard
          active="log"
          description="What you've eaten today. Only your own entries show here."
        >
          <LogView
            entries={entries}
            foods={foods}
            recipes={recipes}
            todaysPlan={todaysPlan}
          />
        </FolderCard>
      </main>
    </>
  );
}
