"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Week view, capsule-gauge family take 1 of 3 — a "graduated cylinder"
 * treatment: the track reads like a measuring cylinder, with tick marks at
 * every quarter of the scale (a heavier tick at the DEFAULT_GOALS line) and
 * a flat-topped "meniscus" fill instead of a fully rounded pill. Clicking a
 * day no longer pops a floating badge above the bar — the value renders
 * overlaid directly inside that day's own column, docked just under the
 * liquid's surface.
 *
 * Per live feedback, column labels now carry the short date (e.g. "Sep 15")
 * under the weekday abbreviation, not just the weekday.
 */

import { useState } from "react";

import {
  MACRO_HEX,
  MacroLegend,
  formatCalories,
  formatGrams,
  shortDateLabel,
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
const TICKS = [0.25, 0.5, 0.75, 1];

function CylinderColumn({
  day,
  max,
  goal,
  selected,
  onToggle,
  overlay,
  fillStyle,
}: {
  day: DailyTotal;
  max: number;
  goal: number;
  selected: boolean;
  onToggle: () => void;
  overlay: React.ReactNode;
  fillStyle: { heightPx: number; background: string } | null;
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
        className="relative w-full overflow-hidden rounded-[6px] border border-border/60 bg-muted/40"
        style={{ height: CHART_HEIGHT }}
      >
        {TICKS.map((t) => (
          <div
            key={t}
            className="pointer-events-none absolute inset-x-0 h-px bg-border"
            style={{ bottom: `${t * 100}%` }}
            aria-hidden
          />
        ))}
        <div
          className="pointer-events-none absolute inset-x-0 z-10 h-[2px] bg-foreground/50"
          style={{ bottom: `${goalPct}%` }}
          aria-hidden
        />
        {fillStyle ? (
          <div
            className="absolute inset-x-0 bottom-0"
            style={{ height: Math.max(fillStyle.heightPx, 8) }}
          >
            <div
              className="absolute inset-x-0 bottom-0 top-1.5"
              style={{ background: fillStyle.background }}
            />
            <div
              className="absolute inset-x-0 top-0 h-1.5 rounded-t-full"
              style={{ background: fillStyle.background, opacity: 0.6 }}
              aria-hidden
            />
            {selected ? (
              <div className="absolute inset-x-0 top-2 z-20 flex justify-center px-1">
                <div className="rounded-sm bg-background/85 px-1.5 py-0.5 text-center text-[10px] font-medium leading-tight text-foreground shadow-sm backdrop-blur-sm">
                  {overlay}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="absolute inset-x-1 bottom-1.5 h-2 rounded-[3px] border border-dashed border-border" />
        )}
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
          {weekDays.map((day) => (
            <CylinderColumn
              key={day.date}
              day={day}
              max={maxCalories}
              goal={caloriesGoal}
              selected={selectedDay === day.date}
              onToggle={() => toggle(day.date)}
              overlay={formatCalories(day.calories)}
              fillStyle={
                day.calories === null
                  ? null
                  : {
                      heightPx: Math.round(
                        (day.calories / maxCalories) * CHART_HEIGHT,
                      ),
                      background:
                        day.calories > caloriesGoal
                          ? "#f59e0b"
                          : "var(--primary)",
                    }
              }
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
        <div className="flex gap-2" style={{ height: CHART_HEIGHT }}>
          {weekDays.map((day) => {
            const proteinG = day.proteinG ?? 0;
            const carbsG = day.carbsG ?? 0;
            const fatG = day.fatG ?? 0;
            const totalG = proteinG + carbsG + fatG;
            const proteinPct = totalG > 0 ? (proteinG / totalG) * 100 : 0;
            const carbsPct = totalG > 0 ? (carbsG / totalG) * 100 : 0;
            return (
              <CylinderColumn
                key={day.date}
                day={day}
                max={maxGrams}
                goal={macroGoalTotal}
                selected={selectedDay === day.date}
                onToggle={() => toggle(day.date)}
                overlay={
                  <>
                    P {formatGrams(day.proteinG)}
                    <br />C {formatGrams(day.carbsG)}
                    <br />F {formatGrams(day.fatG)}
                  </>
                }
                fillStyle={
                  day.calories === null
                    ? null
                    : {
                        heightPx: Math.round(
                          (totalG / maxGrams) * CHART_HEIGHT,
                        ),
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
