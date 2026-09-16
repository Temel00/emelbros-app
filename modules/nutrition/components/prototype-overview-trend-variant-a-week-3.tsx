"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Week view, goal-aware family take 2 of 2 — "segmented overflow": rather
 * than one column per day (take 1's shape), this segments the chart by
 * *metric* — a small-multiples stack of four horizontal-bar blocks
 * (Calories, Protein, Carbs, Fat), each with its own goal (the macros via
 * `macroGramGoalsFromCalories`'s 40/30/30 split) and its own scale, one
 * axis per block. Every bar fills solid up to its goal, then a
 * diagonal-stripe texture of the same hue continues past it for whatever's
 * over — a texture change, not a hue swap, so "over goal" reads without
 * relying on color alone. Day labels carry the short date.
 */

import {
  MACRO_HEX,
  formatCalories,
  formatGrams,
  shortDateLabel,
} from "./prototype-overview-marks";
import {
  DEFAULT_GOALS,
  datesOfWeek,
  macroGramGoalsFromCalories,
  weekStartOf,
  weekdayLabel,
  type DailyTotal,
} from "./prototype-overview-shared";
import { WeekRangeHeader } from "./prototype-overview-week-header";

function stripedFill(color: string): string {
  return `repeating-linear-gradient(45deg, ${color} 0px, ${color} 4px, color-mix(in srgb, ${color} 40%, white) 4px, color-mix(in srgb, ${color} 40%, white) 8px)`;
}

function HorizontalGoalRow({
  label,
  value,
  goal,
  max,
  color,
  format,
}: {
  label: string;
  value: number | null;
  goal: number;
  max: number;
  color: string;
  format: (v: number | null) => string;
}) {
  const goalPct = Math.min((goal / max) * 100, 100);
  const basePct = value === null ? 0 : Math.min((value / max) * 100, 100);
  const overPct =
    value !== null && value > goal
      ? Math.min(((value - goal) / max) * 100, 100 - basePct)
      : 0;
  const overGoal = value !== null && value > goal;

  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] leading-tight text-muted-foreground">
        {label}
      </span>
      <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-muted/40">
        <div
          className="pointer-events-none absolute inset-y-0 z-10 w-px bg-foreground/40"
          style={{ left: `${goalPct}%` }}
          aria-hidden
        />
        {value === null ? (
          <div className="absolute inset-y-0 left-1 h-3 w-[calc(100%-8px)] rounded-full border border-dashed border-border" />
        ) : (
          <>
            <div
              className={
                overPct > 0
                  ? "absolute inset-y-0 left-0"
                  : "absolute inset-y-0 left-0 rounded-full"
              }
              style={{ width: `${Math.max(basePct, 1.5)}%`, background: color }}
            />
            {overPct > 0 ? (
              <div
                className="absolute inset-y-0 rounded-r-full"
                style={{
                  left: `${basePct}%`,
                  width: `${overPct}%`,
                  background: stripedFill(color),
                }}
              />
            ) : null}
          </>
        )}
      </div>
      <span className="w-24 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
        {format(value)}
        {overGoal ? (
          <span className="text-amber-600 dark:text-amber-400"> ↑</span>
        ) : null}
      </span>
    </div>
  );
}

function MetricBlock({
  title,
  goalCaption,
  rows,
}: {
  title: string;
  goalCaption: string;
  rows: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">{goalCaption}</span>
      </div>
      <div className="space-y-1.5">{rows}</div>
    </div>
  );
}

export function TrendVariantAWeek3({
  daily,
  cursor,
  onNavigate,
}: {
  daily: DailyTotal[];
  cursor: string;
  onNavigate: (delta: number) => void;
}) {
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
  const maxProtein = Math.max(
    macroGoals.proteinG * 1.6,
    ...weekDays.map((d) => d.proteinG ?? 0),
  );
  const maxCarbs = Math.max(
    macroGoals.carbsG * 1.6,
    ...weekDays.map((d) => d.carbsG ?? 0),
  );
  const maxFat = Math.max(
    macroGoals.fatG * 1.6,
    ...weekDays.map((d) => d.fatG ?? 0),
  );

  function dayLabel(day: DailyTotal) {
    return `${weekdayLabel(day.date)} ${shortDateLabel(day.date)}`;
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

      <MetricBlock
        title="Calories"
        goalCaption={`Goal: ${formatCalories(caloriesGoal)}`}
        rows={weekDays.map((day) => (
          <HorizontalGoalRow
            key={day.date}
            label={dayLabel(day)}
            value={day.calories}
            goal={caloriesGoal}
            max={maxCalories}
            color="var(--primary)"
            format={formatCalories}
          />
        ))}
      />

      <MetricBlock
        title="Protein"
        goalCaption={`Goal: ${formatGrams(macroGoals.proteinG)} (40% of calorie goal)`}
        rows={weekDays.map((day) => (
          <HorizontalGoalRow
            key={day.date}
            label={dayLabel(day)}
            value={day.proteinG}
            goal={macroGoals.proteinG}
            max={maxProtein}
            color={MACRO_HEX.protein}
            format={formatGrams}
          />
        ))}
      />

      <MetricBlock
        title="Carbs"
        goalCaption={`Goal: ${formatGrams(macroGoals.carbsG)} (30% of calorie goal)`}
        rows={weekDays.map((day) => (
          <HorizontalGoalRow
            key={day.date}
            label={dayLabel(day)}
            value={day.carbsG}
            goal={macroGoals.carbsG}
            max={maxCarbs}
            color={MACRO_HEX.carbs}
            format={formatGrams}
          />
        ))}
      />

      <MetricBlock
        title="Fat"
        goalCaption={`Goal: ${formatGrams(macroGoals.fatG)} (30% of calorie goal)`}
        rows={weekDays.map((day) => (
          <HorizontalGoalRow
            key={day.date}
            label={dayLabel(day)}
            value={day.fatG}
            goal={macroGoals.fatG}
            max={maxFat}
            color={MACRO_HEX.fat}
            format={formatGrams}
          />
        ))}
      />
    </div>
  );
}
