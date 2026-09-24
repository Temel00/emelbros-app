import Link from "next/link";

import { OverviewDayView } from "@/modules/nutrition/components/overview-day-view";
import { formatCalories } from "@/modules/nutrition/components/overview-marks";
import { averageOf } from "@/modules/nutrition/lib/overview-goals";
import type { DailyTotal } from "@/modules/nutrition/lib/overview-totals";
import { todayIso, type MonthDay } from "@/modules/nutrition/lib/plan-calendar";
import type { LogEntryWithSource } from "@/modules/nutrition/queries";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * A month grid of per-day calorie totals; tapping a day opens its detail
 * below via the `selected` search param (nutrition.md §3.6, wayfinder #126)
 * — a server-navigated selection rather than client state, matching this
 * page's `<Link>`-driven navigation throughout.
 */
export function OverviewMonthView({
  monthGrid,
  daily,
  selected,
  selectedTotals,
  selectedEntries,
  hrefFor,
}: {
  monthGrid: MonthDay[][];
  daily: DailyTotal[];
  selected: string | null;
  selectedTotals: DailyTotal | undefined;
  selectedEntries: LogEntryWithSource[] | null;
  hrefFor: (params: { selected?: string }) => string;
}) {
  const byDate = new Map(daily.map((d) => [d.date, d]));
  const avgCalories = averageOf(daily, "calories");
  const today = todayIso();

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Average {formatCalories(avgCalories)}/day this month
      </p>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-1 text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
        {monthGrid.flat().map((day) => {
          const total = byDate.get(day.date);
          return (
            <Link
              key={day.date}
              href={hrefFor({ selected: day.date })}
              className={`flex min-h-14 flex-col items-start gap-1 rounded-lg border p-1.5 text-left ${
                day.inCurrentMonth
                  ? "border-border bg-card"
                  : "border-transparent text-muted-foreground/50"
              } ${day.date === today ? "ring-1 ring-primary" : ""} ${
                day.date === selected
                  ? "outline outline-2 outline-offset-1 outline-primary"
                  : ""
              }`}
            >
              <span className="text-xs font-medium">{day.dayNumber}</span>
              <span className="text-[0.65rem] text-muted-foreground">
                {total ? formatCalories(total.calories) : ""}
              </span>
            </Link>
          );
        })}
      </div>

      {selected && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-medium">
            {new Date(`${selected}T00:00:00`).toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </h2>
          <OverviewDayView
            totals={selectedTotals}
            entries={selectedEntries ?? []}
          />
        </div>
      )}
    </div>
  );
}
