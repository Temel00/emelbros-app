"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Week view, goal-guideline take 3 of 3 — each day is a vertical capsule/pill
 * gauge track (rounded-full column) with a tick mark at the DEFAULT_GOALS
 * height; the fill is itself a pill that turns amber once it passes the
 * tick. No card-below-chart: clicking a day embeds a small badge directly on
 * top of that day's fill with the exact value.
 */

import { useState } from "react";

import {
  MACRO_HEX,
  MacroLegend,
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

function PillColumn({
  day,
  max,
  goal,
  selected,
  onToggle,
  badge,
  fillStyle,
}: {
  day: DailyTotal;
  max: number;
  goal: number;
  selected: boolean;
  onToggle: () => void;
  badge: React.ReactNode;
  fillStyle: { heightPx: number; overGoal: boolean; background: string } | null;
}) {
  const goalPct = Math.min((goal / max) * 100, 100);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={
        fillStyle
          ? `${day.date}: ${formatCalories(day.calories)}`
          : `${day.date}: not logged`
      }
      className="relative flex h-full flex-1 flex-col justify-end"
    >
      <div
        className="relative w-full overflow-visible rounded-full bg-muted"
        style={{ height: CHART_HEIGHT }}
      >
        <div
          className="pointer-events-none absolute inset-x-[-3px] z-10 h-[2px] bg-foreground/40"
          style={{ bottom: `${goalPct}%` }}
          aria-hidden
        />
        {fillStyle ? (
          <div
            className="absolute inset-x-0 bottom-0 rounded-full"
            style={{
              height: Math.max(fillStyle.heightPx, 10),
              background: fillStyle.background,
            }}
          />
        ) : (
          <div className="absolute inset-x-0 bottom-0 h-2.5 rounded-full border border-dashed border-border" />
        )}
        {selected && fillStyle ? (
          <div
            className="absolute inset-x-0 z-20 flex justify-center"
            style={{ bottom: Math.max(fillStyle.heightPx, 10) - 4 }}
          >
            <div className="rounded-full border border-border bg-popover px-2 py-0.5 text-[10px] font-medium text-popover-foreground shadow-md">
              {badge}
            </div>
          </div>
        ) : null}
      </div>
    </button>
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
        <div className="flex gap-2" style={{ height: CHART_HEIGHT }}>
          {weekDays.map((day) => {
            const overGoal = (day.calories ?? 0) > caloriesGoal;
            return (
              <PillColumn
                key={day.date}
                day={day}
                max={maxCalories}
                goal={caloriesGoal}
                selected={selectedDay === day.date}
                onToggle={() => toggle(day.date)}
                badge={formatCalories(day.calories)}
                fillStyle={
                  day.calories === null
                    ? null
                    : {
                        heightPx: Math.round(
                          (day.calories / maxCalories) * CHART_HEIGHT,
                        ),
                        overGoal,
                        background: overGoal ? "#f59e0b" : "var(--primary)",
                      }
                }
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
        <div className="flex gap-2" style={{ height: CHART_HEIGHT }}>
          {weekDays.map((day) => {
            const proteinG = day.proteinG ?? 0;
            const carbsG = day.carbsG ?? 0;
            const fatG = day.fatG ?? 0;
            const totalG = proteinG + carbsG + fatG;
            const overGoal = totalG > macroGoalTotal;
            const proteinPct = totalG > 0 ? (proteinG / totalG) * 100 : 0;
            const carbsPct = totalG > 0 ? (carbsG / totalG) * 100 : 0;
            return (
              <PillColumn
                key={day.date}
                day={day}
                max={maxGrams}
                goal={macroGoalTotal}
                selected={selectedDay === day.date}
                onToggle={() => toggle(day.date)}
                badge={
                  <>
                    P {formatGrams(day.proteinG)} · C {formatGrams(day.carbsG)}{" "}
                    · F {formatGrams(day.fatG)}
                  </>
                }
                fillStyle={
                  day.calories === null
                    ? null
                    : {
                        heightPx: Math.round(
                          (totalG / maxGrams) * CHART_HEIGHT,
                        ),
                        overGoal,
                        background: `linear-gradient(to top, ${MACRO_HEX.protein} 0% ${proteinPct}%, ${MACRO_HEX.carbs} ${proteinPct}% ${proteinPct + carbsPct}%, ${MACRO_HEX.fat} ${proteinPct + carbsPct}% 100%)`,
                      }
                }
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
