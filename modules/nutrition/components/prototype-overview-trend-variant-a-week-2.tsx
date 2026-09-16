"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Week view, goal-guideline take 2 of 3 — a "ghost" target outline sitting
 * behind each bar at the DEFAULT_GOALS height (an empty bordered box, not a
 * line), so the goal reads as a container to fill rather than a threshold to
 * cross. The real bar fill turns amber once it pokes past the ghost's top
 * edge. No card-below-chart: clicking a day pops a speech-bubble overlay
 * (with a pointer nub) above that day's bar.
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

function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap">
      <div className="rounded-md border border-border bg-popover px-2 py-1 text-[10px] font-medium text-popover-foreground shadow-md">
        {children}
      </div>
      <div className="mx-auto -mt-px size-2 rotate-45 border-b border-r border-border bg-popover" />
    </div>
  );
}

function GhostColumn({
  day,
  max,
  goal,
  selected,
  onToggle,
  content,
  renderFill,
}: {
  day: DailyTotal;
  max: number;
  goal: number;
  selected: boolean;
  onToggle: () => void;
  content: React.ReactNode;
  renderFill: () => {
    heightPx: number;
    overGoal: boolean;
    node: React.ReactNode;
  };
}) {
  const goalPx = Math.round((goal / max) * CHART_HEIGHT);
  const isEmpty = day.calories === null;

  if (isEmpty) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-label={`${day.date}: not logged`}
        className="relative h-full flex-1"
      >
        <div
          className="absolute inset-x-0 bottom-0 rounded-[4px] border border-dashed border-border"
          style={{ height: goalPx }}
        />
      </button>
    );
  }

  const { heightPx, overGoal, node } = renderFill();

  return (
    <div className="relative h-full flex-1">
      {selected ? <Bubble>{content}</Bubble> : null}
      <div
        className={`absolute inset-x-0 bottom-0 rounded-[4px] border ${
          overGoal ? "border-amber-500/60" : "border-foreground/25"
        }`}
        style={{ height: goalPx }}
        aria-hidden
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={`${day.date}: ${formatCalories(day.calories)}`}
        className="absolute inset-x-0 bottom-0"
        style={{ height: heightPx }}
      >
        {node}
      </button>
    </div>
  );
}

export function TrendVariantAWeek2({
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
    caloriesGoal * 1.15,
    ...weekDays.map((d) => d.calories ?? 0),
  );
  const maxGrams = Math.max(
    macroGoalTotal * 1.15,
    ...weekDays.map((d) => (d.proteinG ?? 0) + (d.carbsG ?? 0) + (d.fatG ?? 0)),
  );
  const avgCalories = averageOf(weekDays, "calories");
  const avgProtein = averageOf(weekDays, "proteinG");
  const avgCarbs = averageOf(weekDays, "carbsG");
  const avgFat = averageOf(weekDays, "fatG");

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
        <div
          className="flex h-36 items-end gap-2"
          style={{ height: CHART_HEIGHT }}
        >
          {weekDays.map((day) => {
            const value = day.calories ?? 0;
            const overGoal = value > caloriesGoal;
            const heightPx = Math.max(
              Math.round((value / maxCalories) * CHART_HEIGHT),
              4,
            );
            return (
              <GhostColumn
                key={day.date}
                day={day}
                max={maxCalories}
                goal={caloriesGoal}
                selected={selectedDay === day.date}
                onToggle={() => toggle(day.date)}
                content={formatCalories(day.calories)}
                renderFill={() => ({
                  heightPx,
                  overGoal,
                  node: (
                    <div
                      className={`h-full w-full rounded-[4px] ${overGoal ? "bg-amber-500" : "bg-primary"}`}
                    />
                  ),
                })}
              />
            );
          })}
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
        <div className="flex items-end gap-2" style={{ height: CHART_HEIGHT }}>
          {weekDays.map((day) => {
            const totalG =
              (day.proteinG ?? 0) + (day.carbsG ?? 0) + (day.fatG ?? 0);
            const overGoal = totalG > macroGoalTotal;
            const heightPx = Math.round((totalG / maxGrams) * CHART_HEIGHT);
            return (
              <GhostColumn
                key={day.date}
                day={day}
                max={maxGrams}
                goal={macroGoalTotal}
                selected={selectedDay === day.date}
                onToggle={() => toggle(day.date)}
                content={
                  <>
                    P {formatGrams(day.proteinG)} · C {formatGrams(day.carbsG)}{" "}
                    · F {formatGrams(day.fatG)}
                  </>
                }
                renderFill={() => ({
                  heightPx,
                  overGoal,
                  node: (
                    <MacroStackedBar
                      proteinG={day.proteinG}
                      carbsG={day.carbsG}
                      fatG={day.fatG}
                      maxG={maxGrams}
                      heightPx={CHART_HEIGHT}
                    />
                  ),
                })}
              />
            );
          })}
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
