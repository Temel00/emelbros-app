"use client";

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
 *
 * Clicking any bar expands a detail card below both charts for that date,
 * with an "Open day view" action that bubbles up to switch the harness to
 * the day-view carousel on that exact date.
 *
 * Per live feedback, the detail card's macro readout is locked in on the
 * "full words + colored dot matching the goal-bar/legend palette" style —
 * the other two candidate styles (compact P/C/F abbreviations, full words
 * with no dot) are removed rather than kept as a switcher option. The
 * selected-day highlight was also called out as too subtle (a flat
 * `bg-muted` tint indistinguishable from hover) — it now gets a primary
 * ring/fill plus a permanently-visible day-of-month number so the selected
 * column reads unambiguously against its neighbors.
 */

import { useState } from "react";

import {
  Bar,
  MACRO_COLORS,
  MacroLegend,
  MacroStackedBar,
  formatCalories,
  formatGrams,
} from "./prototype-overview-marks";
import {
  averageOf,
  fullDateLabel,
  monthLabel,
  monthStartOf,
  type DailyTotal,
} from "./prototype-overview-shared";

function dayOfMonth(iso: string): number {
  return Number(iso.slice(8, 10));
}

function DayDetailMacros({ day }: { day: DailyTotal }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
      <span className="flex items-center gap-1.5 text-foreground">
        <span
          className={`size-2 rounded-full ${MACRO_COLORS.protein}`}
          aria-hidden
        />
        Protein{" "}
        <span className="text-muted-foreground">
          {formatGrams(day.proteinG)}
        </span>
      </span>
      <span className="flex items-center gap-1.5 text-foreground">
        <span
          className={`size-2 rounded-full ${MACRO_COLORS.carbs}`}
          aria-hidden
        />
        Carbs{" "}
        <span className="text-muted-foreground">{formatGrams(day.carbsG)}</span>
      </span>
      <span className="flex items-center gap-1.5 text-foreground">
        <span
          className={`size-2 rounded-full ${MACRO_COLORS.fat}`}
          aria-hidden
        />
        Fat{" "}
        <span className="text-muted-foreground">{formatGrams(day.fatG)}</span>
      </span>
    </div>
  );
}

export function TrendVariantAMonth({
  daily,
  cursor,
  onNavigate,
  onOpenDayView,
}: {
  daily: DailyTotal[];
  cursor: string;
  onNavigate: (delta: number) => void;
  onOpenDayView: (date: string) => void;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

  const selectedDay = selectedDate
    ? (monthDays.find((d) => d.date === selectedDate) ?? null)
    : null;

  function toggle(date: string) {
    setSelectedDate((cur) => (cur === date ? null : date));
  }

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
          {monthDays.map((day) => {
            const selected = selectedDate === day.date;
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => toggle(day.date)}
                title={`${day.date}: ${formatCalories(day.calories)}`}
                className={`flex flex-1 flex-col items-center gap-1 rounded-md border p-1 pb-0.5 transition-colors ${
                  selected
                    ? "border-primary bg-primary/15 ring-1 ring-primary"
                    : "border-transparent hover:bg-muted/50"
                }`}
              >
                <Bar
                  value={day.calories}
                  max={maxCalories}
                  colorClassName="bg-primary"
                />
                <span
                  className={`text-[9px] tabular-nums ${
                    selected
                      ? "font-bold text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {dayOfMonth(day.date)}
                </span>
              </button>
            );
          })}
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
          {monthDays.map((day) => {
            const selected = selectedDate === day.date;
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => toggle(day.date)}
                title={`${day.date}: P ${formatGrams(day.proteinG)} · C ${formatGrams(day.carbsG)} · F ${formatGrams(day.fatG)}`}
                className={`flex flex-1 flex-col items-center gap-1 rounded-md border p-1 pb-0.5 transition-colors ${
                  selected
                    ? "border-primary bg-primary/15 ring-1 ring-primary"
                    : "border-transparent hover:bg-muted/50"
                }`}
              >
                <MacroStackedBar
                  proteinG={day.proteinG}
                  carbsG={day.carbsG}
                  fatG={day.fatG}
                  maxG={maxGrams}
                />
                <span
                  className={`text-[9px] tabular-nums ${
                    selected
                      ? "font-bold text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {dayOfMonth(day.date)}
                </span>
              </button>
            );
          })}
        </div>
        <MacroLegend className="mt-3" />
      </div>

      {selectedDay ? (
        <div className="rounded-xl border border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">
              {fullDateLabel(selectedDay.date)}
            </h3>
            <button
              type="button"
              onClick={() => onOpenDayView(selectedDay.date)}
              className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20"
            >
              Open day view →
            </button>
          </div>
          {selectedDay.calories === null ? (
            <p className="text-sm text-muted-foreground">
              Not logged — no meals recorded this day.
            </p>
          ) : (
            <div className="space-y-1.5">
              <span className="text-lg font-bold tabular-nums">
                {formatCalories(selectedDay.calories)}
              </span>
              <DayDetailMacros day={selectedDay} />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
