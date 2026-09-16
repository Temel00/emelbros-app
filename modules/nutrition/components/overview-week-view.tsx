import type { ReactNode } from "react";

import {
  formatCalories,
  GoalFillBar,
  MACRO_HEX,
  MacroLegend,
} from "@/modules/nutrition/components/overview-marks";
import {
  averageOf,
  DEFAULT_GOALS,
  macroGramGoalsFromCalories,
} from "@/modules/nutrition/lib/overview-goals";
import type { DailyTotal } from "@/modules/nutrition/lib/overview-totals";
import type { PlanDay } from "@/modules/nutrition/lib/plan-calendar";

const MACRO_GOALS = macroGramGoalsFromCalories(DEFAULT_GOALS.calories);

const ROWS = [
  {
    key: "calories" as const,
    label: "Calories",
    goal: DEFAULT_GOALS.calories,
    color: "var(--color-primary)",
  },
  { key: "proteinG" as const, label: "Protein", goal: MACRO_GOALS.proteinG, color: MACRO_HEX.protein },
  { key: "carbsG" as const, label: "Carbs", goal: MACRO_GOALS.carbsG, color: MACRO_HEX.carbs },
  { key: "fatG" as const, label: "Fat", goal: MACRO_GOALS.fatG, color: MACRO_HEX.fat },
];

/** Keeps a grid row's cells direct siblings of the outer grid (mirrors `MealPlanWeekView`'s `GridRow`). */
function GridRow({ children }: { children: ReactNode }) {
  return <div className="contents">{children}</div>;
}

/** Calorie/macro guideline rows across the week, one column per day (nutrition.md §3.6, wayfinder #126). */
export function OverviewWeekView({
  days,
  daily,
}: {
  days: PlanDay[];
  daily: DailyTotal[];
}) {
  const byDate = new Map(daily.map((d) => [d.date, d]));
  const avgCalories = averageOf(daily, "calories");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Average {formatCalories(avgCalories)}/day this week
      </p>

      <div className="overflow-x-auto">
        <div
          className="grid w-fit gap-x-2 gap-y-3"
          style={{
            gridTemplateColumns: `80px repeat(${days.length}, minmax(48px, 1fr))`,
          }}
        >
          <GridRow>
            <div />
            {days.map((day) => (
              <div
                key={day.date}
                className="text-center text-xs font-medium text-muted-foreground"
              >
                {day.label}
              </div>
            ))}
          </GridRow>

          {ROWS.map((row) => (
            <GridRow key={row.key}>
              <div className="sticky left-0 flex items-center bg-background text-xs font-medium text-muted-foreground">
                {row.label}
              </div>
              {days.map((day) => {
                const total = byDate.get(day.date);
                const value = total ? total[row.key] : null;
                return (
                  <div key={day.date} className="flex justify-center">
                    <GoalFillBar
                      value={value}
                      goal={row.goal}
                      color={row.color}
                      heightPx={64}
                    />
                  </div>
                );
              })}
            </GridRow>
          ))}
        </div>
      </div>

      <MacroLegend />
    </div>
  );
}
