"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Week view, capsule-gauge family take 3 of 3 — a flat "segmented meter"
 * treatment: the capsule is divided into discrete rounded-square segments
 * (like a level meter/EQ), with the goal marked by a small side notch rather
 * than a full-width line. Clicking a day docks the value as a chip sitting
 * right at the top edge of the filled segments, inside the column itself.
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
const SEGMENTS = 10;
const SEGMENT_GAP = 3;

function SegmentColumn({
  day,
  max,
  goal,
  selected,
  onToggle,
  chip,
  fillStyle,
}: {
  day: DailyTotal;
  max: number;
  goal: number;
  selected: boolean;
  onToggle: () => void;
  chip: React.ReactNode;
  fillStyle: { filledSegments: number; background: string } | null;
}) {
  const goalSegment = Math.round((goal / max) * SEGMENTS);
  const segmentHeight =
    (CHART_HEIGHT - SEGMENT_GAP * (SEGMENTS - 1)) / SEGMENTS;
  const fillHeightPx = fillStyle
    ? fillStyle.filledSegments * (segmentHeight + SEGMENT_GAP) - SEGMENT_GAP
    : 0;

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
        className="relative w-full overflow-hidden rounded-[3px] bg-muted"
        style={{ height: CHART_HEIGHT }}
      >
        {goalSegment > 0 && goalSegment <= SEGMENTS ? (
          <div
            className="pointer-events-none absolute -left-1 z-10 h-0.5 w-1.5 rounded-full bg-foreground/60"
            style={{
              bottom:
                goalSegment * (segmentHeight + SEGMENT_GAP) - SEGMENT_GAP / 2,
            }}
            aria-hidden
          />
        ) : null}
        {fillStyle ? (
          <div
            className="absolute inset-x-0 bottom-0"
            style={{ height: fillHeightPx, background: fillStyle.background }}
          />
        ) : (
          <div className="absolute inset-x-1 bottom-1.5 h-2 rounded-[3px] border border-dashed border-border" />
        )}
        {/* segment gap lines punched on top of the continuous fill/track */}
        {Array.from({ length: SEGMENTS - 1 }, (_, i) => (
          <div
            key={i}
            className="pointer-events-none absolute inset-x-0 z-10 bg-card"
            style={{
              height: SEGMENT_GAP,
              bottom: (i + 1) * segmentHeight + i * SEGMENT_GAP,
            }}
            aria-hidden
          />
        ))}
        {selected && fillStyle ? (
          <div
            className="absolute inset-x-0 z-20 flex justify-center"
            style={{ bottom: Math.min(fillHeightPx, CHART_HEIGHT - 24) }}
          >
            <div className="rounded-md bg-foreground px-1.5 py-0.5 text-center text-[10px] font-medium leading-tight text-background shadow-md">
              {chip}
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
              <SegmentColumn
                key={day.date}
                day={day}
                max={maxCalories}
                goal={caloriesGoal}
                selected={selectedDay === day.date}
                onToggle={() => toggle(day.date)}
                chip={formatCalories(day.calories)}
                fillStyle={
                  day.calories === null
                    ? null
                    : {
                        filledSegments: Math.max(
                          Math.round((day.calories / maxCalories) * SEGMENTS),
                          1,
                        ),
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
            const proteinPct = totalG > 0 ? (proteinG / totalG) * 100 : 0;
            const carbsPct = totalG > 0 ? (carbsG / totalG) * 100 : 0;
            return (
              <SegmentColumn
                key={day.date}
                day={day}
                max={maxGrams}
                goal={macroGoalTotal}
                selected={selectedDay === day.date}
                onToggle={() => toggle(day.date)}
                chip={
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
                        filledSegments: Math.max(
                          Math.round((totalG / maxGrams) * SEGMENTS),
                          1,
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
