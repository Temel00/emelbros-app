/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Day view, visual-aid take 3 of 3 — a horizontal calories-vs-goal gauge up
 * top, and a tiny inline stacked macro bar next to every entry (its
 * proportional protein/carbs/fat split at a glance, no hover needed).
 *
 * "Today" quick-jump take 3: a full-width snackbar docked to the bottom edge
 * of the card ("Viewing Tue, Mar 3 · Jump to today"), replacing the rejected
 * inline text link next to the date. The nav row's right side carries a
 * permanent "See in month view" action instead.
 */

import {
  buildMockDayEntries,
  fullDateLabel,
  DEFAULT_GOALS,
  type DailyTotal,
} from "./prototype-overview-shared";
import {
  MACRO_COLORS,
  formatCalories,
  formatGrams,
} from "./prototype-overview-marks";

function MiniMacroBar({
  proteinG,
  carbsG,
  fatG,
}: {
  proteinG: number;
  carbsG: number;
  fatG: number;
}) {
  const total = proteinG + carbsG + fatG;
  if (total <= 0) return null;
  const segments = [
    { value: proteinG, className: MACRO_COLORS.protein },
    { value: carbsG, className: MACRO_COLORS.carbs },
    { value: fatG, className: MACRO_COLORS.fat },
  ].filter((s) => s.value > 0);

  return (
    <div className="flex h-1.5 w-14 shrink-0 gap-px overflow-hidden rounded-full">
      {segments.map((seg, i) => (
        <div
          key={i}
          className={seg.className}
          style={{ width: `${(seg.value / total) * 100}%` }}
        />
      ))}
    </div>
  );
}

export function TrendVariantADay3({
  daily,
  cursor,
  todayDate,
  onNavigate,
  onJumpToday,
  onSeeInMonthView,
}: {
  daily: DailyTotal[];
  cursor: string;
  todayDate: string;
  onNavigate: (delta: number) => void;
  onJumpToday: () => void;
  onSeeInMonthView: (date: string) => void;
}) {
  const index = daily.findIndex((d) => d.date === cursor);
  const day = daily[index] ?? daily[daily.length - 1];
  const entries = buildMockDayEntries(day);
  const canGoBack = index > 0;
  const canGoForward = index >= 0 && index < daily.length - 1;

  const caloriesGoal = DEFAULT_GOALS.calories!;
  const calBarMax = Math.max(day.calories ?? 0, caloriesGoal) * 1.1;
  const calFillPct =
    calBarMax > 0 ? Math.min(((day.calories ?? 0) / calBarMax) * 100, 100) : 0;
  const calGoalPct = calBarMax > 0 ? (caloriesGoal / calBarMax) * 100 : 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="p-4 pb-0">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate(-1)}
            disabled={!canGoBack}
            aria-label="Previous day"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
          >
            ←
          </button>
          <h3 className="text-sm font-medium text-foreground">
            {fullDateLabel(day.date)}
          </h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onNavigate(1)}
              disabled={!canGoForward}
              aria-label="Next day"
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
            >
              →
            </button>
            <button
              type="button"
              onClick={() => onSeeInMonthView(day.date)}
              className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20"
            >
              See in month view →
            </button>
          </div>
        </div>

        {day.calories === null ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Not logged — no meals recorded this day.
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold tabular-nums">
                  {formatCalories(day.calories)}
                </span>
                <span className="text-xs text-muted-foreground">
                  goal {formatCalories(caloriesGoal)}
                </span>
              </div>
              <div className="relative h-3 w-full rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${calFillPct}%` }}
                />
                <div
                  className="absolute top-0 h-full w-px bg-foreground/50"
                  style={{ left: `${calGoalPct}%` }}
                  aria-hidden
                />
              </div>
              <span className="mt-1 block text-xs text-muted-foreground">
                P {formatGrams(day.proteinG)} · C {formatGrams(day.carbsG)} · F{" "}
                {formatGrams(day.fatG)}
              </span>
            </div>

            <ul className="space-y-1.5">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                  <MiniMacroBar
                    proteinG={entry.proteinG}
                    carbsG={entry.carbsG}
                    fatG={entry.fatG}
                  />
                  <span className="w-16 shrink-0 text-right tabular-nums text-muted-foreground">
                    {formatCalories(entry.calories)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {cursor !== todayDate ? (
        <button
          type="button"
          onClick={onJumpToday}
          className="mt-4 flex w-full items-center justify-between bg-foreground/5 px-4 py-2 text-xs text-muted-foreground hover:bg-foreground/10"
        >
          <span>Viewing {fullDateLabel(day.date)}</span>
          <span className="font-medium text-primary">Jump to today →</span>
        </button>
      ) : null}
    </div>
  );
}
