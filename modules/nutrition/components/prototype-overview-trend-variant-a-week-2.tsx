"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Week view, goal-aware family take 1 of 2 — "per-macro overflow": each
 * macro gets its own goal (a 40/30/30 protein/fat/carb split of the calorie
 * goal, via `macroGramGoalsFromCalories`), rendered as its own mini bar
 * rather than folded into one combined macro stack. Every bar (calories and
 * each macro) fills solid up to its own goal, then — if it's exceeded —
 * keeps going in a diagonal-stripe texture of the *same* hue, so "over
 * goal" is a texture change, not a hue swap (a color-blind-safe secondary
 * encoding, not a new series). Column labels carry the short date under the
 * weekday abbreviation.
 *
 * Per live feedback, each macro's goal guideline now sits at the same
 * horizontal height across protein/carbs/fat: `max` is a fixed multiple of
 * that macro's own goal (`GOAL_FRACTION`) rather than stretched to fit
 * whatever the week's actual data peaks at, so a high-carb day no longer
 * pushes the carbs guideline down relative to protein/fat's. A day far
 * enough over goal to exceed that fixed headroom just clips at the
 * container's top edge instead of moving the line.
 *
 * Double-clicking a day column (either chart) now jumps to the day view for
 * that date, mirroring month view's "Open day view" action.
 */

import { useState } from "react";

import {
  MACRO_HEX,
  MacroLegend,
  formatCalories,
  formatGrams,
  shortDateLabel,
  stripedFill,
} from "./prototype-overview-marks";
import {
  DEFAULT_GOALS,
  averageOf,
  datesOfWeek,
  macroGramGoalsFromCalories,
  weekStartOf,
  weekdayLabel,
  type DailyTotal,
} from "./prototype-overview-shared";
import { WeekRangeHeader } from "./prototype-overview-week-header";

const CHART_HEIGHT = 144;
const GOAL_FRACTION = 1 / 1.6;

function GoalFillBar({
  value,
  goal,
  max,
  color,
}: {
  value: number | null;
  goal: number;
  max: number;
  color: string;
}) {
  if (value === null) {
    return (
      <div className="absolute inset-x-1 bottom-1.5 h-2 rounded-[3px] border border-dashed border-border" />
    );
  }
  const baseVal = Math.min(value, goal);
  const overVal = Math.max(value - goal, 0);
  const baseH = Math.max(Math.round((baseVal / max) * CHART_HEIGHT), 2);
  const overH = Math.round((overVal / max) * CHART_HEIGHT);

  return (
    <div
      className="absolute inset-x-0 bottom-0 flex flex-col-reverse"
      style={{ height: baseH + overH }}
    >
      <div
        className={overH > 0 ? "w-full" : "w-full rounded-t-[3px]"}
        style={{ height: baseH, background: color }}
      />
      {overH > 0 ? (
        <div
          className="w-full rounded-t-[3px]"
          style={{ height: overH, background: stripedFill(color) }}
        />
      ) : null}
    </div>
  );
}

function CaloriesColumn({
  day,
  max,
  goal,
  selected,
  onToggle,
  onOpenDayView,
}: {
  day: DailyTotal;
  max: number;
  goal: number;
  selected: boolean;
  onToggle: () => void;
  onOpenDayView: () => void;
}) {
  const goalPct = Math.min((goal / max) * 100, 100);
  const overGoal = (day.calories ?? 0) > goal;

  return (
    <button
      type="button"
      onClick={onToggle}
      onDoubleClick={onOpenDayView}
      aria-label={
        day.calories === null
          ? `${day.date}: not logged`
          : `${day.date}: ${formatCalories(day.calories)}, goal ${formatCalories(goal)}`
      }
      className="relative flex h-full flex-1 flex-col justify-end"
    >
      <div
        className="relative w-full overflow-hidden rounded-[6px] border border-border/60 bg-muted/40"
        style={{ height: CHART_HEIGHT }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 z-10 h-px bg-foreground/40"
          style={{ bottom: `${goalPct}%` }}
          aria-hidden
        />
        <GoalFillBar
          value={day.calories}
          goal={goal}
          max={max}
          color="var(--primary)"
        />
        {selected && day.calories !== null ? (
          <div className="absolute inset-x-0 top-1 z-20 flex justify-center px-1">
            <div className="rounded-sm bg-background/90 px-1.5 py-0.5 text-center text-[10px] font-medium leading-tight text-foreground shadow-sm backdrop-blur-sm">
              {formatCalories(day.calories)}
              {overGoal ? (
                <span className="text-amber-600 dark:text-amber-400">
                  {" "}
                  (+{formatCalories(day.calories! - goal)})
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </button>
  );
}

function MacroMiniBar({
  value,
  goal,
  max,
  hex,
}: {
  value: number | null;
  goal: number;
  max: number;
  hex: string;
}) {
  const goalPct = Math.min((goal / max) * 100, 100);
  return (
    <div
      className="relative flex-1 overflow-hidden rounded-[4px] border border-border/60 bg-muted/40"
      style={{ height: CHART_HEIGHT }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 z-10 h-px bg-foreground/40"
        style={{ bottom: `${goalPct}%` }}
        aria-hidden
      />
      <GoalFillBar value={value} goal={goal} max={max} color={hex} />
    </div>
  );
}

function MacroTripleColumn({
  day,
  goals,
  maxes,
  selected,
  onToggle,
  onOpenDayView,
}: {
  day: DailyTotal;
  goals: { proteinG: number; carbsG: number; fatG: number };
  maxes: { protein: number; carbs: number; fat: number };
  selected: boolean;
  onToggle: () => void;
  onOpenDayView: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      onDoubleClick={onOpenDayView}
      aria-label={
        day.calories === null
          ? `${day.date}: not logged`
          : `${day.date}: P ${formatGrams(day.proteinG)} · C ${formatGrams(day.carbsG)} · F ${formatGrams(day.fatG)}`
      }
      className="relative flex h-full flex-1 flex-col justify-end"
    >
      <div className="flex gap-[3px]" style={{ height: CHART_HEIGHT }}>
        <MacroMiniBar
          value={day.proteinG}
          goal={goals.proteinG}
          max={maxes.protein}
          hex={MACRO_HEX.protein}
        />
        <MacroMiniBar
          value={day.carbsG}
          goal={goals.carbsG}
          max={maxes.carbs}
          hex={MACRO_HEX.carbs}
        />
        <MacroMiniBar
          value={day.fatG}
          goal={goals.fatG}
          max={maxes.fat}
          hex={MACRO_HEX.fat}
        />
      </div>
      {selected && day.calories !== null ? (
        <div className="pointer-events-none absolute inset-x-0 top-1 z-20 flex justify-center px-0.5">
          <div className="rounded-sm bg-background/90 px-1.5 py-0.5 text-center text-[9px] font-medium leading-tight text-foreground shadow-sm backdrop-blur-sm">
            P {formatGrams(day.proteinG)}
            <br />C {formatGrams(day.carbsG)}
            <br />F {formatGrams(day.fatG)}
          </div>
        </div>
      ) : null}
    </button>
  );
}

export function TrendVariantAWeek2({
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
  const macroGoals = macroGramGoalsFromCalories(caloriesGoal);
  const maxCalories = Math.max(
    caloriesGoal * 1.5,
    ...weekDays.map((d) => d.calories ?? 0),
  );
  const maxProtein = macroGoals.proteinG / GOAL_FRACTION;
  const maxCarbs = macroGoals.carbsG / GOAL_FRACTION;
  const maxFat = macroGoals.fatG / GOAL_FRACTION;
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
        <div className="flex gap-2" style={{ height: CHART_HEIGHT }}>
          {weekDays.map((day) => (
            <CaloriesColumn
              key={day.date}
              day={day}
              max={maxCalories}
              goal={caloriesGoal}
              selected={selectedDay === day.date}
              onToggle={() => toggle(day.date)}
              onOpenDayView={() => onOpenDayView(day.date)}
            />
          ))}
        </div>
        <div className="mt-1.5 flex gap-2">
          {weekDays.map((day) => (
            <span
              key={day.date}
              className="flex-1 text-center text-[11px] leading-tight text-muted-foreground"
            >
              {weekdayLabel(day.date)}
              <br />
              <span className="tabular-nums">{shortDateLabel(day.date)}</span>
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
        <p className="mb-2 text-[11px] text-muted-foreground">
          Goals (40/30/30 split of {formatCalories(caloriesGoal)}): P{" "}
          {formatGrams(macroGoals.proteinG)} · C{" "}
          {formatGrams(macroGoals.carbsG)} · F {formatGrams(macroGoals.fatG)}
        </p>
        <div className="flex gap-2" style={{ height: CHART_HEIGHT }}>
          {weekDays.map((day) => (
            <MacroTripleColumn
              key={day.date}
              day={day}
              goals={macroGoals}
              maxes={{ protein: maxProtein, carbs: maxCarbs, fat: maxFat }}
              selected={selectedDay === day.date}
              onToggle={() => toggle(day.date)}
              onOpenDayView={() => onOpenDayView(day.date)}
            />
          ))}
        </div>
        <div className="mt-1.5 flex gap-2">
          {weekDays.map((day) => (
            <span
              key={day.date}
              className="flex-1 text-center text-[11px] leading-tight text-muted-foreground"
            >
              {weekdayLabel(day.date)}
              <br />
              <span className="tabular-nums">{shortDateLabel(day.date)}</span>
            </span>
          ))}
        </div>
        <MacroLegend className="mt-3" />
      </div>
    </div>
  );
}
