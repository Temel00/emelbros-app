import { Suspense } from "react";

import { AppHeader } from "@/components/app-header";
import { OverviewTrendHarness } from "@/modules/nutrition/components/prototype-overview-trend-harness";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";

/**
 * PROTOTYPE ONLY — throwaway route. Delete when wayfinder #125 resolves.
 *
 * Three variants of the nutrition overview trend view, switchable via
 * `?variant=`, on a new `/nutrition/overview-prototype` route — no real
 * overview page exists yet, so this is a new route rather than a shape
 * grafted onto an existing one. Mounted in the real app shell so the owner
 * judges it against real chrome, not a blank canvas.
 *
 * All totals (daily/weekly/monthly, calories + 3 macros) are in-memory mock
 * data shaped to match the real `computeOverviewTotals` output on the
 * unmerged task/124-nutrition-overview-totals branch — see
 * prototype-overview-shared.tsx for the open question this raises about the
 * missing monthly bucket. Nothing here reads `nutrition_log`.
 */
export default async function NutritionOverviewPrototypePage() {
  const member = await getCurrentMember();
  if (!member) return null;

  const supabase = await createClient();

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 pb-24 sm:p-6">
        <div>
          <h1 className="text-xl font-semibold">Overview (prototype)</h1>
          <p className="text-sm text-muted-foreground">
            Three takes on the nutrition trend view: calories as a bar with
            macros stacked below (one axis each, per the dataviz skill), a
            small-multiples grid with one mini chart per measure, and a
            table-first layout with a headline-stat summary card. Switch range
            (Day / Week / Month) and data scenario (established history vs. week
            one vs. day one) independently of layout to see how each handles
            thin data. Flip between layouts with the bar at the bottom.
          </p>
        </div>

        <Suspense>
          <OverviewTrendHarness />
        </Suspense>
      </main>
    </>
  );
}
