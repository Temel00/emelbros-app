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
 *
 * Day and week visual-aid styles are now locked in per live feedback
 * (day: goal bars + bracket-highlight hover; week: per-macro overflow
 * columns) — the `dayStyle`/`weekStyle` switchers are gone. Month's
 * detail-card style was already locked in earlier (no `monthStyle`
 * switcher), and it gained a click-to-expand detail card with an
 * "Open day view" action.
 */

import type { OverviewRange } from "./prototype-overview-shared";
import type { DailyTotal } from "./prototype-overview-shared";
import { TrendVariantADay2 } from "./prototype-overview-trend-variant-a-day-2";
import { TrendVariantAWeek2 } from "./prototype-overview-trend-variant-a-week-2";
import { TrendVariantAMonth } from "./prototype-overview-trend-variant-a-month";

export function TrendVariantA({
  range,
  daily,
  dayCursor,
  weekCursor,
  monthCursor,
  todayDate,
  onNavigateDay,
  onNavigateWeek,
  onNavigateMonth,
  onJumpToday,
  onOpenDayView,
  onSeeInMonthView,
}: {
  range: OverviewRange;
  daily: DailyTotal[];
  dayCursor: string;
  weekCursor: string;
  monthCursor: string;
  todayDate: string;
  onNavigateDay: (delta: number) => void;
  onNavigateWeek: (delta: number) => void;
  onNavigateMonth: (delta: number) => void;
  onJumpToday: () => void;
  onOpenDayView: (date: string) => void;
  onSeeInMonthView: (date: string) => void;
}) {
  if (range === "day") {
    return (
      <TrendVariantADay2
        daily={daily}
        cursor={dayCursor}
        todayDate={todayDate}
        onNavigate={onNavigateDay}
        onJumpToday={onJumpToday}
        onSeeInMonthView={onSeeInMonthView}
      />
    );
  }

  if (range === "week") {
    return (
      <TrendVariantAWeek2
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
      onOpenDayView={onOpenDayView}
    />
  );
}
