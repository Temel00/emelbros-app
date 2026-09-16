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
 * The detail card's macro readout has 3 selectable styles (`cardStyle`):
 * "1" compact abbreviations (P/C/F, the original), "2" full macro words
 * spelled out, "3" the same full words with a colored dot per macro
 * matching the goal-bar/legend palette.
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

export type MonthCardStyle = "1" | "2" | "3";

function DayDetailMacros({
  day,
  cardStyle,
}: {
  day: DailyTotal;
  cardStyle: MonthCardStyle;
}) {
  if (cardStyle === "2") {
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
        <span>Protein {formatGrams(day.proteinG)}</span>
        <span>Carbs {formatGrams(day.carbsG)}</span>
        <span>Fat {formatGrams(day.fatG)}</span>
      </div>
    );
  }

  if (cardStyle === "3") {
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
          <span className="text-muted-foreground">
            {formatGrams(day.carbsG)}
          </span>
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

  return (
    <span className="text-muted-foreground">
      P {formatGrams(day.proteinG)} · C {formatGrams(day.carbsG)} · F{" "}
      {formatGrams(day.fatG)}
    </span>
  );
}

export function TrendVariantAMonth({
  daily,
  cursor,
  onNavigate,
  onOpenDayView,
  cardStyle,
}: {
  daily: DailyTotal[];
  cursor: string;
  onNavigate: (delta: number) => void;
  onOpenDayView: (date: string) => void;
  cardStyle: MonthCardStyle;
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
          {monthDays.map((day) => (
            <button
              key={day.date}
              type="button"
              onClick={() => toggle(day.date)}
              title={`${day.date}: ${formatCalories(day.calories)}`}
              className={`flex flex-1 flex-col items-center gap-1.5 rounded-sm ${
                selectedDate === day.date ? "bg-muted" : "hover:bg-muted/50"
              }`}
            >
              <Bar
                value={day.calories}
                max={maxCalories}
                colorClassName="bg-primary"
              />
            </button>
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
            <button
              key={day.date}
              type="button"
              onClick={() => toggle(day.date)}
              title={`${day.date}: P ${formatGrams(day.proteinG)} · C ${formatGrams(day.carbsG)} · F ${formatGrams(day.fatG)}`}
              className={`flex flex-1 flex-col items-center gap-1.5 rounded-sm ${
                selectedDate === day.date ? "bg-muted" : "hover:bg-muted/50"
              }`}
            >
              <MacroStackedBar
                proteinG={day.proteinG}
                carbsG={day.carbsG}
                fatG={day.fatG}
                maxG={maxGrams}
              />
            </button>
          ))}
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
          ) : cardStyle === "1" ? (
            <div className="flex items-baseline gap-4 text-sm">
              <span className="text-lg font-bold tabular-nums">
                {formatCalories(selectedDay.calories)}
              </span>
              <DayDetailMacros day={selectedDay} cardStyle={cardStyle} />
            </div>
          ) : (
            <div className="space-y-1.5">
              <span className="text-lg font-bold tabular-nums">
                {formatCalories(selectedDay.calories)}
              </span>
              <DayDetailMacros day={selectedDay} cardStyle={cardStyle} />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
