"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Owns range (day/week/month) state, reads `?variant=` for layout, and
 * renders the chosen trend-view variant plus the floating switcher.
 *
 * Variant A no longer picks a range-sized slice of rows to display all at
 * once — per live feedback it carousels through independent cursors (a
 * single day / week-start / month-start), one per range, each bounded by
 * the mock history's date span. Variant B/C are unchanged and keep the old
 * "pick a pre-computed row array for this range" model.
 */

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  PrototypeSwitcher,
  type PrototypeVariant,
} from "@/components/prototype/prototype-switcher";
import {
  buildMockOverview,
  monthStartOf,
  weekStartOf,
  type OverviewRange,
} from "./prototype-overview-shared";
import { TrendVariantA } from "./prototype-overview-trend-variant-a";
import { TrendVariantB } from "./prototype-overview-trend-variant-b";
import { TrendVariantC } from "./prototype-overview-trend-variant-c";

const VARIANTS: PrototypeVariant[] = [
  { key: "a", name: "Calories + macro stack" },
  { key: "b", name: "Small multiples" },
  { key: "c", name: "Table-first" },
];

const RANGES: { key: OverviewRange; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function addMonths(monthStart: string, delta: number): string {
  const d = new Date(`${monthStart}T00:00:00.000Z`);
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d.toISOString().slice(0, 10);
}

function clamp(value: string, min: string, max: string): string {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function OverviewTrendHarness() {
  const searchParams = useSearchParams();
  const variant = searchParams.get("variant") ?? "a";

  const [range, setRange] = useState<OverviewRange>("day");
  const overview = useMemo(() => buildMockOverview(), []);

  const firstDate = overview.daily[0].date;
  const lastDate = overview.daily[overview.daily.length - 1].date;
  const minWeekStart = weekStartOf(new Date(`${firstDate}T00:00:00.000Z`));
  const maxWeekStart = weekStartOf(new Date(`${lastDate}T00:00:00.000Z`));
  const minMonthStart = monthStartOf(firstDate);
  const maxMonthStart = monthStartOf(lastDate);

  const [dayCursor, setDayCursor] = useState(lastDate);
  const [weekCursor, setWeekCursor] = useState(maxWeekStart);
  const [monthCursor, setMonthCursor] = useState(maxMonthStart);

  const rows =
    range === "day"
      ? overview.daily
      : range === "week"
        ? overview.weekly
        : overview.monthly;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex gap-1 rounded-lg border border-border p-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRange(r.key)}
            className={`rounded-md px-3 py-1 text-sm ${
              range === r.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {variant === "b" ? (
        <TrendVariantB rows={rows} />
      ) : variant === "c" ? (
        <TrendVariantC rows={rows} />
      ) : (
        <TrendVariantA
          range={range}
          daily={overview.daily}
          dayCursor={dayCursor}
          weekCursor={weekCursor}
          monthCursor={monthCursor}
          todayDate={lastDate}
          onNavigateDay={(delta) =>
            setDayCursor((c) => clamp(addDays(c, delta), firstDate, lastDate))
          }
          onNavigateWeek={(delta) =>
            setWeekCursor((c) =>
              clamp(addDays(c, delta * 7), minWeekStart, maxWeekStart),
            )
          }
          onNavigateMonth={(delta) =>
            setMonthCursor((c) =>
              clamp(addMonths(c, delta), minMonthStart, maxMonthStart),
            )
          }
          onJumpToday={() => setDayCursor(lastDate)}
          onOpenDayView={(date) => {
            setDayCursor(date);
            setRange("day");
          }}
          onSeeInMonthView={(date) => {
            setMonthCursor(monthStartOf(date));
            setRange("month");
          }}
        />
      )}

      <PrototypeSwitcher variants={VARIANTS} current={variant} />
    </div>
  );
}
