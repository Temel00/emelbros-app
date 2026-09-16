/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Variant A — "Calories + macro stack," the chosen layout. Per live
 * feedback, day/week/month are no longer three densities of the same
 * rows-in-a-row chart: each is now its own view with its own cursor
 * (day view is a detail screen, week/month are scoped, carouseled bar
 * charts), so this file is just a router onto them. Variant B/C are
 * unchanged and still take the old `rows` prop — only the winning
 * variant got this rework.
 */

import type { OverviewRange } from "./prototype-overview-shared";
import type { DailyTotal } from "./prototype-overview-shared";
import { TrendVariantADay } from "./prototype-overview-trend-variant-a-day";
import { TrendVariantAWeek } from "./prototype-overview-trend-variant-a-week";
import { TrendVariantAMonth } from "./prototype-overview-trend-variant-a-month";

export function TrendVariantA({
  range,
  daily,
  dayCursor,
  weekCursor,
  monthCursor,
  onNavigateDay,
  onNavigateWeek,
  onNavigateMonth,
}: {
  range: OverviewRange;
  daily: DailyTotal[];
  dayCursor: string;
  weekCursor: string;
  monthCursor: string;
  onNavigateDay: (delta: number) => void;
  onNavigateWeek: (delta: number) => void;
  onNavigateMonth: (delta: number) => void;
}) {
  if (range === "day") {
    return (
      <TrendVariantADay
        daily={daily}
        cursor={dayCursor}
        onNavigate={onNavigateDay}
      />
    );
  }

  if (range === "week") {
    return (
      <TrendVariantAWeek
        daily={daily}
        cursor={weekCursor}
        onNavigate={onNavigateWeek}
      />
    );
  }

  return (
    <TrendVariantAMonth
      daily={daily}
      cursor={monthCursor}
      onNavigate={onNavigateMonth}
    />
  );
}
