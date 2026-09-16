/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Widget Variant C — "Split into two cards": calories-today and today's-plan
 * as separate widget cards, each independently pinnable/reorderable like My
 * Darts and Habits are today. Directly tests the ticket's open question —
 * does the combined content want to split — by making the split real rather
 * than describing it. The harness renders both as distinct `PinZoneItem`s.
 */

import { CheckCircle2, Circle } from "lucide-react";

import type { MockPlanEntry } from "./prototype-overview-shared";

export function OverviewWidgetVariantC_Calories({
  caloriesToday,
}: {
  caloriesToday: number;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-bold tabular-nums">
        {caloriesToday.toLocaleString()}
      </span>
      <span className="text-xs text-muted-foreground">kcal logged today</span>
    </div>
  );
}

export function OverviewWidgetVariantC_Plan({
  plan,
}: {
  plan: MockPlanEntry[];
}) {
  if (plan.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing planned today — log a meal to get started.
      </p>
    );
  }

  return (
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
  );
}
