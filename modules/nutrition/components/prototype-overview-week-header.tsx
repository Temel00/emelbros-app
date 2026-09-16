"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Shared header for all 3 week-view sub-variants: carousel arrows, the
 * date-range label, and the calendar popover showing where this week sits
 * in its month. Identical across all 3 prototypes — the sub-variants only
 * differ in the chart below, so this is the "shared <Header> is fine" case,
 * not a shared layout.
 */

import { useState } from "react";
import { Calendar } from "lucide-react";

import { monthGridDays, weekRangeLabel } from "./prototype-overview-shared";

export function WeekRangeHeader({
  cursor,
  weekDates,
  onNavigate,
  canGoBack,
  canGoForward,
}: {
  cursor: string;
  weekDates: string[];
  onNavigate: (delta: number) => void;
  canGoBack: boolean;
  canGoForward: boolean;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const monthOfWeek = `${cursor.slice(0, 7)}-01`;

  return (
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
                  { month: "long", year: "numeric", timeZone: "UTC" },
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
  );
}
