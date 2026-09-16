"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Week view, goal-guideline take 1 of 3 — a dashed guideline at the
 * DEFAULT_GOALS height on both charts; the calories bar itself splits into a
 * base segment (up to goal) plus an amber "over goal" segment on top when a
 * day exceeds it. No more card-below-chart: clicking a day's bar toggles a
 * small floating label directly above that bar with its exact value(s).
 */

import { useState } from "react";

import {
  MacroLegend,
  MacroStackedBar,
  formatCalories,
  formatGrams,
} from "./prototype-overview-marks";
import {
  DEFAULT_GOALS,
  averageOf,
  datesOfWeek,
  weekStartOf,
  weekdayLabel,
  type DailyTotal,
} from "./prototype-overview-shared";
import { WeekRangeHeader } from "./prototype-overview-week-header";

const CHART_HEIGHT = 144;

function CalorieColumn({
  day,
  max,
  goal,
  selected,
  onToggle,
}: {
  day: DailyTotal;
  max: number;
  goal: number;
  selected: boolean;
  onToggle: () => void;
}) {
  if (day.calories === null) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-label={`${day.date}: not logged`}
        className="relative h-full flex-1"
      >
        <div className="absolute inset-x-0 bottom-0 h-1.5 rounded-t-[4px] border border-dashed border-border" />
      </button>
    );
  }

  const value = day.calories;
  const basePx = Math.round((Math.min(value, goal) / max) * CHART_HEIGHT);
  const overPx = Math.round((Math.max(value - goal, 0) / max) * CHART_HEIGHT);

  return (
    <div className="relative h-full flex-1">
      {selected ? (
        <div
          className="absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-1.5 py-0.5 text-[10px] font-medium text-popover-foreground shadow-md"
          style={{ bottom: basePx + overPx + 6 }}
        >
          {formatCalories(value)}
        </div>
      ) : null}
      <button
        type="button"
        onClick={onToggle}
        aria-label={`${day.date}: ${formatCalories(value)}`}
        className="absolute inset-x-0 bottom-0 flex flex-col-reverse"
        style={{ height: basePx + overPx }}
      >
        <div
          className={`w-full bg-primary ${overPx === 0 ? "rounded-t-[4px]" : ""}`}
          style={{ height: basePx }}
        />
        {overPx > 0 ? (
          <div
            className="w-full rounded-t-[4px] bg-amber-500"
            style={{ height: overPx }}
          />
        ) : null}
      </button>
    </div>
  );
}

function MacroColumn({
  day,
  maxG,
  goalG,
  selected,
  onToggle,
}: {
  day: DailyTotal;
  maxG: number;
  goalG: number;
  selected: boolean;
  onToggle: () => void;
}) {
  const totalG = (day.proteinG ?? 0) + (day.carbsG ?? 0) + (day.fatG ?? 0);
  const overGoal = totalG > goalG;
  const totalPx =
    maxG > 0
      ? Math.min(Math.round((totalG / maxG) * CHART_HEIGHT), CHART_HEIGHT)
      : 0;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${day.date}: P ${formatGrams(day.proteinG)} C ${formatGrams(day.carbsG)} F ${formatGrams(day.fatG)}`}
      className="relative flex h-full flex-1 flex-col justify-end"
    >
      {selected ? (
        <div
          className="absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-1.5 py-0.5 text-[10px] font-medium text-popover-foreground shadow-md"
          style={{ bottom: totalPx + 6 }}
        >
          P {formatGrams(day.proteinG)} · C {formatGrams(day.carbsG)} · F{" "}
          {formatGrams(day.fatG)}
        </div>
      ) : null}
      <div className={overGoal ? "rounded-[4px] ring-2 ring-amber-500" : ""}>
        <MacroStackedBar
          proteinG={day.proteinG}
          carbsG={day.carbsG}
          fatG={day.fatG}
          maxG={maxG}
          heightPx={CHART_HEIGHT}
        />
      </div>
    </button>
  );
}

export function TrendVariantAWeek1({
  daily,
  cursor,
  onNavigate,
}: {
  daily: DailyTotal[];
  cursor: string;
  onNavigate: (delta: number) => void;
}) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const byDate = new Map(daily.map((d) => [d.date, d]));
  const weekDates = datesOfWeek(cursor);
  const weekDays: DailyTotal[] = weekDates.map(
    (date) =>
      byDate.get(date) ?? {
        date,
        calories: null,
        proteinG: null,
        carbsG: null,
        fatG: null,
      },
  );

  const minWeekStart = weekStartOf(new Date(`${daily[0].date}T00:00:00.000Z`));
  const maxWeekStart = weekStartOf(
    new Date(`${daily[daily.length - 1].date}T00:00:00.000Z`),
  );
  const canGoBack = cursor > minWeekStart;
  const canGoForward = cursor < maxWeekStart;

  const caloriesGoal = DEFAULT_GOALS.calories!;
  const macroGoalTotal =
    DEFAULT_GOALS.proteinG! + DEFAULT_GOALS.carbsG! + DEFAULT_GOALS.fatG!;
  const maxCalories = Math.max(
    caloriesGoal,
    ...weekDays.map((d) => d.calories ?? 0),
  );
  const maxGrams = Math.max(
    macroGoalTotal,
    ...weekDays.map((d) => (d.proteinG ?? 0) + (d.carbsG ?? 0) + (d.fatG ?? 0)),
  );
  const avgCalories = averageOf(weekDays, "calories");
  const avgProtein = averageOf(weekDays, "proteinG");
  const avgCarbs = averageOf(weekDays, "carbsG");
  const avgFat = averageOf(weekDays, "fatG");
  const goalLinePct = (caloriesGoal / maxCalories) * 100;
  const macroGoalLinePct = (macroGoalTotal / maxGrams) * 100;

  function toggle(date: string) {
    setSelectedDay((cur) => (cur === date ? null : date));
  }

  return (
    <div className="space-y-6">
      <WeekRangeHeader
        cursor={cursor}
        weekDates={weekDates}
        onNavigate={onNavigate}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
      />

      <div className="rounded-xl border border-border p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-medium text-foreground">Calories</h3>
          <span className="text-xs text-muted-foreground">
            Avg/day: {formatCalories(avgCalories)} · Goal:{" "}
            {formatCalories(caloriesGoal)}
          </span>
        </div>
        <div className="relative" style={{ height: CHART_HEIGHT }}>
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-foreground/30"
            style={{ bottom: `${goalLinePct}%` }}
          />
          <div className="flex h-full items-end gap-2">
            {weekDays.map((day) => (
              <CalorieColumn
                key={day.date}
                day={day}
                max={maxCalories}
                goal={caloriesGoal}
                selected={selectedDay === day.date}
                onToggle={() => toggle(day.date)}
              />
            ))}
          </div>
        </div>
        <div className="mt-1.5 flex gap-2">
          {weekDays.map((day) => (
            <span
              key={day.date}
              className="flex-1 text-center text-[11px] text-muted-foreground"
            >
              {weekdayLabel(day.date)}
            </span>
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
        <div className="relative" style={{ height: CHART_HEIGHT }}>
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-foreground/30"
            style={{ bottom: `${macroGoalLinePct}%` }}
          />
          <div className="flex h-full items-end gap-2">
            {weekDays.map((day) => (
              <MacroColumn
                key={day.date}
                day={day}
                maxG={maxGrams}
                goalG={macroGoalTotal}
                selected={selectedDay === day.date}
                onToggle={() => toggle(day.date)}
              />
            ))}
          </div>
        </div>
        <div className="mt-1.5 flex gap-2">
          {weekDays.map((day) => (
            <span
              key={day.date}
              className="flex-1 text-center text-[11px] text-muted-foreground"
            >
              {weekdayLabel(day.date)}
            </span>
          ))}
        </div>
        <MacroLegend className="mt-3" />
      </div>
    </div>
  );
}
