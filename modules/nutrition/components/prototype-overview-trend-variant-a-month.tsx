/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Month view — one calendar month's daily bars. This is close to the
 * original variant A layout (a bar per day, calories on top and macros
 * stacked below), just scoped to a single month and carouseled via the
 * header instead of showing several months of rolled-up bars at once.
 * Rollup stat is the month's per-logged-day average, not a total. Per-day
 * labels are dropped at this density (up to 31 narrow bars) in favor of a
 * hover title on each bar.
 */

import {
  Bar,
  MacroLegend,
  MacroStackedBar,
  formatCalories,
  formatGrams,
} from "./prototype-overview-marks";
import {
  averageOf,
  monthStartOf,
  type DailyTotal,
} from "./prototype-overview-shared";

function monthLabel(monthStart: string): string {
  return new Date(`${monthStart}T00:00:00.000Z`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function TrendVariantAMonth({
  daily,
  cursor,
  onNavigate,
}: {
  daily: DailyTotal[];
  cursor: string;
  onNavigate: (delta: number) => void;
}) {
  const monthDays = daily.filter((d) => monthStartOf(d.date) === cursor);
  const minMonthStart = monthStartOf(daily[0].date);
  const maxMonthStart = monthStartOf(daily[daily.length - 1].date);
  const canGoBack = cursor > minMonthStart;
  const canGoForward = cursor < maxMonthStart;

  const maxCalories = Math.max(1, ...monthDays.map((d) => d.calories ?? 0));
  const maxGrams = Math.max(
    1,
    ...monthDays.map(
      (d) => (d.proteinG ?? 0) + (d.carbsG ?? 0) + (d.fatG ?? 0),
    ),
  );
  const avgCalories = averageOf(monthDays, "calories");
  const avgProtein = averageOf(monthDays, "proteinG");
  const avgCarbs = averageOf(monthDays, "carbsG");
  const avgFat = averageOf(monthDays, "fatG");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate(-1)}
          disabled={!canGoBack}
          aria-label="Previous month"
          className="rounded-full p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
        >
          ←
        </button>
        <h3 className="text-sm font-medium text-foreground">
          {monthLabel(cursor)}
        </h3>
        <button
          type="button"
          onClick={() => onNavigate(1)}
          disabled={!canGoForward}
          aria-label="Next month"
          className="rounded-full p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
        >
          →
        </button>
      </div>

      <div className="rounded-xl border border-border p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-medium text-foreground">Calories</h3>
          <span className="text-xs text-muted-foreground">
            Avg/day: {formatCalories(avgCalories)}
          </span>
        </div>
        <div className="flex items-end gap-1">
          {monthDays.map((day) => (
            <div
              key={day.date}
              title={`${day.date}: ${formatCalories(day.calories)}`}
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              <Bar
                value={day.calories}
                max={maxCalories}
                colorClassName="bg-primary"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-medium text-foreground">Macros</h3>
          <span className="text-xs text-muted-foreground">
            Avg/day: P {formatGrams(avgProtein)} · C {formatGrams(avgCarbs)} · F{" "}
            {formatGrams(avgFat)}
          </span>
        </div>
        <div className="flex items-end gap-1">
          {monthDays.map((day) => (
            <div
              key={day.date}
              title={`${day.date}: P ${formatGrams(day.proteinG)} · C ${formatGrams(day.carbsG)} · F ${formatGrams(day.fatG)}`}
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              <MacroStackedBar
                proteinG={day.proteinG}
                carbsG={day.carbsG}
                fatG={day.fatG}
                maxG={maxGrams}
              />
            </div>
          ))}
        </div>
        <MacroLegend className="mt-3" />
      </div>
    </div>
  );
}
