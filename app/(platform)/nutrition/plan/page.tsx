import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";

import { MealPlanMonthView } from "@/modules/nutrition/components/meal-plan-month-view";
import { MealPlanWeekView } from "@/modules/nutrition/components/meal-plan-week-view";
import { NutritionNav } from "@/modules/nutrition/components/nutrition-nav";
import {
  addMonths,
  addWeeks,
  getMonthGrid,
  getWeekDays,
  monthRange,
  parseIsoDate,
  todayIso,
  toIsoDate,
  weekRange,
} from "@/modules/nutrition/lib/plan-calendar";
import { getMealPlanEntries, getRecipes } from "@/modules/nutrition/queries";

type ViewMode = "week" | "month";

/**
 * The week/month calendar (nutrition.md §3.4, wayfinder #117). Navigation
 * (prev/next/today/view-toggle) is plain `<Link>`s driven by `anchor`/`view`
 * searchParams rather than client state, so the page stays a server
 * component and every position is a shareable, bookmarkable URL — the
 * settled architecture, deliberately different from the prototype's own
 * throwaway route (#116), which used a client-side variant-switching
 * harness only meant for comparing layouts, not for real navigation.
 */
export default async function MealPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ anchor?: string; view?: string }>;
}) {
  const member = await getCurrentMember();
  // The proxy (ADR-0011) redirects signed-out requests to /sign-in before
  // this component ever runs.
  if (!member) return null;

  const { anchor, view: viewParam } = await searchParams;
  const view: ViewMode = viewParam === "month" ? "month" : "week";
  const anchorDate = anchor ? parseIsoDate(anchor) : new Date();

  const supabase = await createClient();
  const range =
    view === "week" ? weekRange(anchorDate) : monthRange(anchorDate);
  const [entries, recipes] = await Promise.all([
    getMealPlanEntries(supabase, range.start, range.end),
    getRecipes(supabase),
  ]);

  const prevAnchor = toIsoDate(
    view === "week" ? addWeeks(anchorDate, -1) : addMonths(anchorDate, -1),
  );
  const nextAnchor = toIsoDate(
    view === "week" ? addWeeks(anchorDate, 1) : addMonths(anchorDate, 1),
  );

  function hrefFor(params: { anchor?: string; view?: ViewMode }) {
    const nextView = params.view ?? view;
    // Carry the current anchor forward (e.g. toggling view keeps the same
    // date) unless the caller passes its own, like "today" or a nav step.
    const nextAnchorValue = params.anchor ?? anchor;
    const qs = new URLSearchParams();
    if (nextView !== "week") qs.set("view", nextView);
    if (nextAnchorValue) qs.set("anchor", nextAnchorValue);
    const query = qs.toString();
    return query ? `/nutrition/plan?${query}` : "/nutrition/plan";
  }

  const heading =
    view === "week"
      ? `Week of ${getWeekDays(anchorDate)[0].dayOfMonth}`
      : anchorDate.toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        });

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-4 sm:p-6">
        <NutritionNav active="plan" />

        <div>
          <h1 className="text-xl font-semibold">Meal plan</h1>
          <p className="text-sm text-muted-foreground">
            What the household is eating. Anyone can plan, edit, or mark a
            meal cooked.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="outline"
              render={
                <Link href={hrefFor({ anchor: prevAnchor })} aria-label="Previous">
                  <ChevronLeft />
                </Link>
              }
            />
            <Button
              size="sm"
              variant="outline"
              render={<Link href={hrefFor({ anchor: todayIso() })}>Today</Link>}
            />
            <Button
              size="icon-sm"
              variant="outline"
              render={
                <Link href={hrefFor({ anchor: nextAnchor })} aria-label="Next">
                  <ChevronRight />
                </Link>
              }
            />
          </div>

          <p className="text-sm font-medium">{heading}</p>

          <div className="flex gap-1 rounded-lg bg-muted p-0.5">
            <Link
              href={hrefFor({ view: "week" })}
              className={`rounded-md px-2.5 py-1 text-sm font-medium ${
                view === "week"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Week
            </Link>
            <Link
              href={hrefFor({ view: "month" })}
              className={`rounded-md px-2.5 py-1 text-sm font-medium ${
                view === "month"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Month
            </Link>
          </div>
        </div>

        {view === "week" ? (
          <MealPlanWeekView
            days={getWeekDays(anchorDate)}
            entries={entries}
            recipes={recipes}
          />
        ) : (
          <MealPlanMonthView
            monthGrid={getMonthGrid(anchorDate)}
            entries={entries}
            recipes={recipes}
          />
        )}
      </main>
    </>
  );
}
