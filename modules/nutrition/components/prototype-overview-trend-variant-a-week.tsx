"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Week view — one week's 7 days as bars (variant A's calories-top,
 * macros-below layout, sized up since it's always exactly 7 columns).
 * The header carousels between weeks; a calendar button shows where this
 * week sits in its month. Clicking a day's bar reveals that day's numbers
 * below the chart instead of always showing per-day labels. Summary stats
 * are the week's per-logged-day average, not a total — a rollup over a
 * period should read as "a typical day," not "everything added up."
 */

import { useState } from "react";
import { Calendar } from "lucide-react";

import {
  Bar,
  MacroLegend,
  MacroStackedBar,
  formatCalories,
  formatGrams,
} from "./prototype-overview-marks";
import {
  averageOf,
  weekStartOf,
  type DailyTotal,
} from "./prototype-overview-shared";

function datesOfWeek(weekStart: string): string[] {
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function weekRangeLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

function dayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString(undefined, {
    weekday: "short",
    timeZone: "UTC",
  });
}

/** Monday-first grid of a month's dates, padded with nulls to align weekdays. */
function monthGridDays(monthStart: string): (string | null)[] {
  const start = new Date(`${monthStart}T00:00:00.000Z`);
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstWeekday = start.getUTCDay();
  const leadingBlanks = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const cells: (string | null)[] = Array(leadingBlanks).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10));
  }
  return cells;
}

export function TrendVariantAWeek({
  daily,
  cursor,
  onNavigate,
}: {
  daily: DailyTotal[];
  cursor: string;
  onNavigate: (delta: number) => void;
}) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

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

  const maxCalories = Math.max(1, ...weekDays.map((d) => d.calories ?? 0));
  const maxGrams = Math.max(
    1,
    ...weekDays.map((d) => (d.proteinG ?? 0) + (d.carbsG ?? 0) + (d.fatG ?? 0)),
  );
  const avgCalories = averageOf(weekDays, "calories");
  const avgProtein = averageOf(weekDays, "proteinG");
  const avgCarbs = averageOf(weekDays, "carbsG");
  const avgFat = averageOf(weekDays, "fatG");

  const monthOfWeek = `${cursor.slice(0, 7)}-01`;
  const expanded = weekDays.find((d) => d.date === expandedDay) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate(-1)}
          disabled={!canGoBack}
          aria-label="Previous week"
          className="rounded-full p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
        >
          ←
        </button>
        <div className="relative flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">
            {weekRangeLabel(cursor)}
          </h3>
          <button
            type="button"
            onClick={() => setCalendarOpen((v) => !v)}
            aria-label="Show week in month"
            className="rounded-full p-1 text-muted-foreground hover:bg-muted"
          >
            <Calendar className="size-4" />
          </button>
          {calendarOpen ? (
            <>
              <button
                type="button"
                aria-hidden
                tabIndex={-1}
                onClick={() => setCalendarOpen(false)}
                className="fixed inset-0 z-40 cursor-default"
              />
              <div className="absolute left-1/2 top-full z-50 mt-2 w-56 -translate-x-1/2 rounded-xl border border-border bg-popover p-3 shadow-lg">
                <p className="mb-2 text-center text-xs font-medium text-muted-foreground">
                  {new Date(`${monthOfWeek}T00:00:00.000Z`).toLocaleDateString(
                    undefined,
                    {
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    },
                  )}
                </p>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] tabular-nums">
                  {monthGridDays(monthOfWeek).map((date, i) => (
                    <span
                      key={i}
                      className={`rounded p-1 ${
                        date && weekDates.includes(date)
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {date ? Number(date.slice(8)) : ""}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onNavigate(1)}
          disabled={!canGoForward}
          aria-label="Next week"
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
        <div className="flex items-end gap-2">
          {weekDays.map((day) => (
            <button
              key={day.date}
              type="button"
              onClick={() =>
                setExpandedDay(expandedDay === day.date ? null : day.date)
              }
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              <Bar
                value={day.calories}
                max={maxCalories}
                heightPx={128}
                colorClassName={
                  day.date === expandedDay ? "bg-primary" : "bg-primary/70"
                }
              />
              <span className="text-[11px] text-muted-foreground">
                {dayLabel(day.date)}
              </span>
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
        <div className="flex items-end gap-2">
          {weekDays.map((day) => (
            <button
              key={day.date}
              type="button"
              onClick={() =>
                setExpandedDay(expandedDay === day.date ? null : day.date)
              }
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              <MacroStackedBar
                proteinG={day.proteinG}
                carbsG={day.carbsG}
                fatG={day.fatG}
                maxG={maxGrams}
                heightPx={128}
              />
              <span className="text-[11px] text-muted-foreground">
                {dayLabel(day.date)}
              </span>
            </button>
          ))}
        </div>
        <MacroLegend className="mt-3" />
      </div>

      {expanded ? (
        <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
          <p className="mb-1 font-medium text-foreground">
            {new Date(`${expanded.date}T00:00:00.000Z`).toLocaleDateString(
              undefined,
              {
                weekday: "long",
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              },
            )}
          </p>
          {expanded.calories === null ? (
            <p className="text-muted-foreground">Not logged.</p>
          ) : (
            <p className="text-muted-foreground">
              {formatCalories(expanded.calories)} · P{" "}
              {formatGrams(expanded.proteinG)} · C{" "}
              {formatGrams(expanded.carbsG)} · F {formatGrams(expanded.fatG)}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
