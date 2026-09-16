/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Day view, visual-aid take 2 of 3 — calories + each macro gets its own
 * horizontal goal-progress bar (fill vs. DEFAULT_GOALS, with a distinct
 * treatment once the fill passes the goal tick) instead of a donut.
 * "Today" quick-jump is a floating circular button pinned to the card's
 * bottom-right corner.
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

function GoalBar({
  label,
  value,
  goal,
  fillClassName,
  format,
}: {
  label: string;
  value: number | null;
  goal: number;
  fillClassName: string;
  format: (v: number | null) => string;
}) {
  const v = value ?? 0;
  const barMax = Math.max(v, goal) * 1.1;
  const fillPct = barMax > 0 ? Math.min((v / barMax) * 100, 100) : 0;
  const goalPct = barMax > 0 ? (goal / barMax) * 100 : 0;
  const overGoal = v > goal;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums text-foreground">
          {format(value)}{" "}
          <span className="text-muted-foreground">/ {format(goal)}</span>
        </span>
      </div>
      <div className="relative h-2.5 w-full rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${fillClassName} ${overGoal ? "ring-2 ring-offset-1 ring-offset-card" : ""}`}
          style={{ width: `${fillPct}%` }}
        />
        <div
          className="absolute top-0 h-full w-px bg-foreground/50"
          style={{ left: `${goalPct}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}

export function TrendVariantADay2({
  daily,
  cursor,
  todayDate,
  onNavigate,
  onJumpToday,
}: {
  daily: DailyTotal[];
  cursor: string;
  todayDate: string;
  onNavigate: (delta: number) => void;
  onJumpToday: () => void;
}) {
  const index = daily.findIndex((d) => d.date === cursor);
  const day = daily[index] ?? daily[daily.length - 1];
  const entries = buildMockDayEntries(day);
  const canGoBack = index > 0;
  const canGoForward = index >= 0 && index < daily.length - 1;

  return (
    <div className="relative rounded-xl border border-border p-4">
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
        <button
          type="button"
          onClick={() => onNavigate(1)}
          disabled={!canGoForward}
          aria-label="Next day"
          className="rounded-full p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
        >
          →
        </button>
      </div>

      {day.calories === null ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Not logged — no meals recorded this day.
        </div>
      ) : (
        <div className="space-y-5 pb-10">
          <div className="space-y-3">
            <GoalBar
              label="Calories"
              value={day.calories}
              goal={DEFAULT_GOALS.calories!}
              fillClassName="bg-primary"
              format={formatCalories}
            />
            <GoalBar
              label="Protein"
              value={day.proteinG}
              goal={DEFAULT_GOALS.proteinG!}
              fillClassName={MACRO_COLORS.protein}
              format={formatGrams}
            />
            <GoalBar
              label="Carbs"
              value={day.carbsG}
              goal={DEFAULT_GOALS.carbsG!}
              fillClassName={MACRO_COLORS.carbs}
              format={formatGrams}
            />
            <GoalBar
              label="Fat"
              value={day.fatG}
              goal={DEFAULT_GOALS.fatG!}
              fillClassName={MACRO_COLORS.fat}
              format={formatGrams}
            />
          </div>

          <ul className="space-y-1.5">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-border p-2.5 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span>{entry.title}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatCalories(entry.calories)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>P {formatGrams(entry.proteinG)}</span>
                  <span>C {formatGrams(entry.carbsG)}</span>
                  <span>F {formatGrams(entry.fatG)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {cursor !== todayDate ? (
        <button
          type="button"
          onClick={onJumpToday}
          aria-label="Jump to today"
          className="absolute bottom-3 right-3 flex size-11 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground shadow-lg hover:opacity-90"
        >
          Today
        </button>
      ) : null}
    </div>
  );
}
