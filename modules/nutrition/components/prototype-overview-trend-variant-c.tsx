/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Variant C — "Table-first": a headline-stat summary card (latest period's
 * totals, the My Darts widget's `text-2xl font-bold tabular-nums` pattern)
 * above a spreadsheet-style table (recipe-box.tsx's `rounded-xl
 * border border-border`, `bg-muted/50` header, tabular-nums, alternating row
 * tint). Per the dataviz skill's "is it even a chart?" guidance — when >~7
 * rows all carry meaning, a table earns its place over more bars.
 */

import {
  formatCalories,
  formatGrams,
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
  if ("weekStart" in row) return `Week of ${shortDateLabel(row.weekStart)}`;
  return new Date(`${row.monthStart}T00:00:00.000Z`).toLocaleDateString(
    undefined,
    {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    },
  );
}

export function TrendVariantC({ rows }: { rows: Row[] }) {
  const latest = rows[rows.length - 1];
  const displayRows = [...rows].reverse();

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border p-4">
        <p className="mb-3 text-xs text-muted-foreground">
          Latest — {rowLabel(latest)}
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-2xl font-bold tabular-nums">
              {formatCalories(latest?.calories ?? null)}
            </p>
            <p className="text-xs text-muted-foreground">Calories</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
              {formatGrams(latest?.proteinG ?? null)}
            </p>
            <p className="text-xs text-muted-foreground">Protein</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-500">
              {formatGrams(latest?.carbsG ?? null)}
            </p>
            <p className="text-xs text-muted-foreground">Carbs</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums text-violet-600 dark:text-violet-400">
              {formatGrams(latest?.fatG ?? null)}
            </p>
            <p className="text-xs text-muted-foreground">Fat</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Period</th>
              <th className="px-3 py-2 text-right font-medium">Calories</th>
              <th className="px-3 py-2 text-right font-medium">Protein</th>
              <th className="px-3 py-2 text-right font-medium">Carbs</th>
              <th className="px-3 py-2 text-right font-medium">Fat</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, i) => {
              const notLogged = row.calories === null;
              return (
                <tr
                  key={i}
                  className={`${i % 2 === 1 ? "bg-muted/20" : ""} ${notLogged ? "text-muted-foreground" : ""}`}
                >
                  <td className="px-3 py-2 tabular-nums">{rowLabel(row)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {notLogged ? "Not logged" : formatCalories(row.calories)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatGrams(row.proteinG)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatGrams(row.carbsG)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatGrams(row.fatG)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
