import {
  formatCalories,
  formatGrams,
  GoalFillBar,
  MACRO_HEX,
  MacroLegend,
} from "@/modules/nutrition/components/overview-marks";
import { logEntryTitle } from "@/modules/nutrition/lib/log-entry-title";
import {
  DEFAULT_GOALS,
  macroGramGoalsFromCalories,
} from "@/modules/nutrition/lib/overview-goals";
import type { DailyTotal } from "@/modules/nutrition/lib/overview-totals";
import type { LogEntryWithSource } from "@/modules/nutrition/queries";

const MACRO_GOALS = macroGramGoalsFromCalories(DEFAULT_GOALS.calories);

const MACRO_ROWS = [
  {
    key: "proteinG" as const,
    label: "Protein",
    goal: MACRO_GOALS.proteinG,
    color: MACRO_HEX.protein,
  },
  {
    key: "carbsG" as const,
    label: "Carbs",
    goal: MACRO_GOALS.carbsG,
    color: MACRO_HEX.carbs,
  },
  {
    key: "fatG" as const,
    label: "Fat",
    goal: MACRO_GOALS.fatG,
    color: MACRO_HEX.fat,
  },
];

/**
 * A single day's totals against the placeholder goals plus its log entries
 * (nutrition.md §3.6, wayfinder #126). Reused as-is for the month view's
 * selected-day detail panel rather than duplicating this layout.
 */
export function OverviewDayView({
  totals,
  entries,
}: {
  totals: DailyTotal | undefined;
  entries: LogEntryWithSource[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border border-border bg-card p-4">
        <div>
          <p className="text-xs text-muted-foreground">Calories</p>
          <p className="text-2xl font-semibold tabular-nums">
            {formatCalories(totals?.calories ?? null)}
          </p>
          <p className="text-xs text-muted-foreground">
            goal {formatCalories(DEFAULT_GOALS.calories)}
          </p>
        </div>
        <div className="flex gap-6">
          {MACRO_ROWS.map((row) => (
            <div key={row.key} className="flex flex-col items-center gap-1">
              <GoalFillBar
                value={totals?.[row.key] ?? null}
                goal={row.goal}
                color={row.color}
                heightPx={64}
              />
              <p className="text-xs text-muted-foreground">{row.label}</p>
              <p className="text-xs font-medium tabular-nums">
                {formatGrams(totals?.[row.key] ?? null)}
              </p>
            </div>
          ))}
        </div>
      </div>
      <MacroLegend />

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Logged</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-2 p-3"
              >
                <div>
                  <p className="text-sm font-medium">{logEntryTitle(entry)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.logged_at).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <p className="text-sm tabular-nums text-muted-foreground">
                  {formatCalories(entry.calories)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
