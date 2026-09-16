import { CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { formatCalories } from "@/modules/nutrition/components/overview-marks";
import { entryTitle, todayIso } from "@/modules/nutrition/lib/plan-calendar";
import {
  getMealPlanEntries,
  getOverviewTotals,
} from "@/modules/nutrition/queries";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";

/**
 * The nutrition dashboard widget (nutrition.md §6, ADR-0005): a zero-prop
 * Server Component about today — how many calories are logged so far, and
 * what's still planned to cook. The dashboard frame owns the card chrome
 * and "Nutrition" heading, so this renders only the body.
 */
export async function NutritionWidget() {
  const member = await getCurrentMember();
  if (!member) return null;

  const supabase = await createClient();
  const today = todayIso();
  const [totals, entries] = await Promise.all([
    getOverviewTotals(supabase, today, today),
    getMealPlanEntries(supabase, today, today),
  ]);

  const calories = totals.daily[0]?.calories ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-2xl font-bold tabular-nums">
            {formatCalories(calories)}
          </p>
          <p className="text-xs text-muted-foreground">logged today</p>
        </div>
        <Link
          href="/nutrition/plan"
          className={buttonVariants({ size: "sm", variant: "outline" })}
        >
          Today&apos;s plan
        </Link>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing planned today — add a meal to the plan.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center gap-2 text-sm">
              {entry.cooked_at ? (
                <CheckCircle2 className="size-4 shrink-0 text-primary" />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span
                className={
                  entry.cooked_at ? "text-muted-foreground line-through" : ""
                }
              >
                {entryTitle(entry)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
