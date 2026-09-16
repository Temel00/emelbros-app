/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Widget Variant A — "One card, stat + full list": today's calories as a
 * headline stat (My Darts widget's `text-2xl font-bold tabular-nums`
 * pattern), with the full planned-meals list below it, each entry marked
 * done/not-done (plan-chip.tsx's `opacity-60` + `line-through` +
 * CheckCircle2/Circle pattern). Tests the ticket's "does this hold as one
 * card" question directly.
 */

import { CheckCircle2, Circle } from "lucide-react";

import type { MockPlanEntry } from "./prototype-overview-shared";

export function OverviewWidgetVariantA({
  caloriesToday,
  plan,
}: {
  caloriesToday: number;
  plan: MockPlanEntry[];
}) {
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
          Nothing planned today — log a meal to get started.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {plan.map((entry) => {
            const cooked = entry.cookedAt !== null;
            return (
              <li key={entry.id} className="flex items-center gap-1.5 text-sm">
                {cooked ? (
                  <CheckCircle2
                    className="size-4 shrink-0 text-primary"
                    aria-hidden
                  />
                ) : (
                  <Circle
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                )}
                <span
                  className={cooked ? "text-muted-foreground line-through" : ""}
                >
                  {entry.title}
                </span>
                <span className="text-xs capitalize text-muted-foreground">
                  ({entry.mealSlot})
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
