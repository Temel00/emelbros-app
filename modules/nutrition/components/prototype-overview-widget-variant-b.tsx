/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Widget Variant B — "One card, stat + progress line": same single card as
 * Variant A, but the plan collapses to a "2 of 3 planned meals cooked"
 * progress line (Habits widget's `${done} of ${scheduled} done today`
 * pattern) instead of a full list — structurally different, testing
 * whether a glance-only summary is enough here, with a text link into the
 * module for the detail (habits-widget.tsx's empty-state link pattern).
 */

import Link from "next/link";

import type { MockPlanEntry } from "./prototype-overview-shared";

export function OverviewWidgetVariantB({
  caloriesToday,
  plan,
}: {
  caloriesToday: number;
  plan: MockPlanEntry[];
}) {
  const cookedCount = plan.filter((entry) => entry.cookedAt !== null).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tabular-nums">
          {caloriesToday.toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground">kcal logged today</span>
      </div>

      {plan.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No meals planned today —{" "}
          <Link href="/nutrition" className="underline hover:text-foreground">
            log one
          </Link>
          .
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {cookedCount} of {plan.length}
          </span>{" "}
          planned meals cooked —{" "}
          <Link href="/nutrition" className="underline hover:text-foreground">
            view plan
          </Link>
        </p>
      )}
    </div>
  );
}
