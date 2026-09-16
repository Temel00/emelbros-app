/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Variant A — "Calories + macro stack": two charts, one axis each (dataviz
 * skill's one-axis rule — calories in kcal and macros in grams never share a
 * scale). Calories as a sequential single-hue bar (magnitude, not identity).
 * Macros as a stacked bar directly below, same x-axis, so the reader can
 * still see "what was today's calorie total made of" without a shared scale.
 */

import {
  Bar,
  MacroLegend,
  MacroStackedBar,
  formatCalories,
  shortDateLabel,
} from "./prototype-overview-marks";
import type {
  DailyTotal,
  MonthlyTotal,
  WeeklyTotal,
} from "./prototype-overview-shared";

type Row = DailyTotal | WeeklyTotal | MonthlyTotal;

function rowLabel(row: Row): string {
  if ("date" in row) return shortDateLabel(row.date);
  if ("weekStart" in row) return `w/o ${shortDateLabel(row.weekStart)}`;
  return new Date(`${row.monthStart}T00:00:00.000Z`).toLocaleDateString(
    undefined,
    {
      month: "short",
      timeZone: "UTC",
    },
  );
}

export function TrendVariantA({ rows }: { rows: Row[] }) {
  const maxCalories = Math.max(1, ...rows.map((r) => r.calories ?? 0));
  const maxGrams = Math.max(
    1,
    ...rows.map((r) => (r.proteinG ?? 0) + (r.carbsG ?? 0) + (r.fatG ?? 0)),
  );
  const latest = rows[rows.length - 1];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-medium text-foreground">Calories</h3>
          <span className="text-xs text-muted-foreground">
            Latest: {formatCalories(latest?.calories ?? null)}
          </span>
        </div>
        <div className="flex items-end gap-1">
          {rows.map((row, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <Bar
                value={row.calories}
                max={maxCalories}
                colorClassName="bg-primary"
              />
              <span className="text-[10px] text-muted-foreground">
                {rowLabel(row)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-medium text-foreground">Macros</h3>
          <MacroLegend />
        </div>
        <div className="flex items-end gap-1">
          {rows.map((row, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <MacroStackedBar
                proteinG={row.proteinG}
                carbsG={row.carbsG}
                fatG={row.fatG}
                maxG={maxGrams}
              />
              <span className="text-[10px] text-muted-foreground">
                {rowLabel(row)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
