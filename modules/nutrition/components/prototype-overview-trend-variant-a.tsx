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
 * Day and week each now have 3 visual-aid sub-variants (per live feedback:
 * "3 prototypes... try 3 very different types of visual aids"), picked via
 * `dayStyle`/`weekStyle`. Month is single — it gained a click-to-expand
 * detail card with an "Open day view" action instead of alternate styles.
 */

import type { OverviewRange } from "./prototype-overview-shared";
import type { DailyTotal } from "./prototype-overview-shared";
import { TrendVariantADay1 } from "./prototype-overview-trend-variant-a-day-1";
import { TrendVariantADay2 } from "./prototype-overview-trend-variant-a-day-2";
import { TrendVariantADay3 } from "./prototype-overview-trend-variant-a-day-3";
import { TrendVariantAWeek1 } from "./prototype-overview-trend-variant-a-week-1";
import { TrendVariantAWeek2 } from "./prototype-overview-trend-variant-a-week-2";
import { TrendVariantAWeek3 } from "./prototype-overview-trend-variant-a-week-3";
import { TrendVariantAMonth } from "./prototype-overview-trend-variant-a-month";

export type DayStyle = "1" | "2" | "3";
export type WeekStyle = "1" | "2" | "3";

export function TrendVariantA({
  range,
  daily,
  dayCursor,
  weekCursor,
  monthCursor,
  todayDate,
  dayStyle,
  weekStyle,
  onNavigateDay,
  onNavigateWeek,
  onNavigateMonth,
  onJumpToday,
  onOpenDayView,
}: {
  range: OverviewRange;
  daily: DailyTotal[];
  dayCursor: string;
  weekCursor: string;
  monthCursor: string;
  todayDate: string;
  dayStyle: DayStyle;
  weekStyle: WeekStyle;
  onNavigateDay: (delta: number) => void;
  onNavigateWeek: (delta: number) => void;
  onNavigateMonth: (delta: number) => void;
  onJumpToday: () => void;
  onOpenDayView: (date: string) => void;
}) {
  if (range === "day") {
    const DayComponent =
      dayStyle === "2"
        ? TrendVariantADay2
        : dayStyle === "3"
          ? TrendVariantADay3
          : TrendVariantADay1;
    return (
      <DayComponent
        daily={daily}
        cursor={dayCursor}
        todayDate={todayDate}
        onNavigate={onNavigateDay}
        onJumpToday={onJumpToday}
      />
    );
  }

  if (range === "week") {
    const WeekComponent =
      weekStyle === "2"
        ? TrendVariantAWeek2
        : weekStyle === "3"
          ? TrendVariantAWeek3
          : TrendVariantAWeek1;
    return (
      <WeekComponent
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
