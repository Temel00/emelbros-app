import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";

import { NutritionNav } from "@/modules/nutrition/components/nutrition-nav";
import { OverviewDayView } from "@/modules/nutrition/components/overview-day-view";
import { OverviewMonthView } from "@/modules/nutrition/components/overview-month-view";
import { OverviewWeekView } from "@/modules/nutrition/components/overview-week-view";
import {
  addDays,
  addMonths,
  addWeeks,
  getMonthGrid,
  getWeekDays,
  monthRange,
  parseIsoDate,
  todayIso,
  toIsoDate,
  weekRange,
} from "@/modules/nutrition/lib/plan-calendar";
import {
  getLogEntriesForDate,
  getOverviewTotals,
} from "@/modules/nutrition/queries";

type ViewMode = "day" | "week" | "month";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ anchor?: string; view?: string; selected?: string }>;
}) {
  const member = await getCurrentMember();
  if (!member) return null;

  const { anchor, view: viewParam, selected } = await searchParams;
  const view: ViewMode =
    viewParam === "day" ? "day" : viewParam === "month" ? "month" : "week";
  const anchorDate = anchor ? parseIsoDate(anchor) : new Date();
  const anchorIso = toIsoDate(anchorDate);

  const supabase = await createClient();
  const range =
    view === "day"
      ? { start: anchorIso, end: anchorIso }
      : view === "week"
        ? weekRange(anchorDate)
        : monthRange(anchorDate);

  const [totals, dayEntries, selectedEntries] = await Promise.all([
    getOverviewTotals(supabase, range.start, range.end),
    view === "day" ? getLogEntriesForDate(supabase, anchorIso) : Promise.resolve(null),
    view === "month" && selected
      ? getLogEntriesForDate(supabase, selected)
      : Promise.resolve(null),
  ]);

  const prevAnchor = toIsoDate(
    view === "day"
      ? addDays(anchorDate, -1)
      : view === "week"
        ? addWeeks(anchorDate, -1)
        : addMonths(anchorDate, -1),
  );
  const nextAnchor = toIsoDate(
    view === "day"
      ? addDays(anchorDate, 1)
      : view === "week"
        ? addWeeks(anchorDate, 1)
        : addMonths(anchorDate, 1),
  );

  function hrefFor(params: {
    anchor?: string;
    view?: ViewMode;
    selected?: string;
  }) {
    const nextView = params.view ?? view;
    const nextAnchorValue = params.anchor ?? anchor;
    const qs = new URLSearchParams();
    if (nextView !== "week") qs.set("view", nextView);
    if (nextAnchorValue) qs.set("anchor", nextAnchorValue);
    if (params.selected) qs.set("selected", params.selected);
    const query = qs.toString();
    return query ? `/nutrition/overview?${query}` : "/nutrition/overview";
  }

  const heading =
    view === "day"
      ? anchorDate.toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
        })
      : view === "week"
        ? `Week of ${getWeekDays(anchorDate)[0].dayOfMonth}`
        : anchorDate.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          });

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-4 sm:p-6">
        <NutritionNav active="overview" />
        <div>
          <h1 className="text-xl font-semibold">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Trends in what&apos;s been logged, against the daily guideline.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="outline"
              render={
                <Link href={hrefFor({ anchor: prevAnchor })} aria-label="Previous">
                  <ChevronLeft />
                </Link>
              }
            />
            <Button
              size="sm"
              variant="outline"
              render={<Link href={hrefFor({ anchor: todayIso() })}>Today</Link>}
            />
            <Button
              size="icon-sm"
              variant="outline"
              render={
                <Link href={hrefFor({ anchor: nextAnchor })} aria-label="Next">
                  <ChevronRight />
                </Link>
              }
            />
          </div>
          <p className="text-sm font-medium">{heading}</p>
          <div className="flex gap-1 rounded-lg bg-muted p-0.5">
            <Link
              href={hrefFor({ view: "day" })}
              className={`rounded-md px-2.5 py-1 text-sm font-medium ${
                view === "day" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              Day
            </Link>
            <Link
              href={hrefFor({ view: "week" })}
              className={`rounded-md px-2.5 py-1 text-sm font-medium ${
                view === "week" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              Week
            </Link>
            <Link
              href={hrefFor({ view: "month" })}
              className={`rounded-md px-2.5 py-1 text-sm font-medium ${
                view === "month" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              Month
            </Link>
          </div>
        </div>

        {view === "day" && (
          <OverviewDayView
            totals={totals.daily.find((d) => d.date === anchorIso)}
            entries={dayEntries ?? []}
          />
        )}
        {view === "week" && (
          <OverviewWeekView days={getWeekDays(anchorDate)} daily={totals.daily} />
        )}
        {view === "month" && (
          <OverviewMonthView
            monthGrid={getMonthGrid(anchorDate)}
            daily={totals.daily}
            selected={selected ?? null}
            selectedTotals={
              selected ? totals.daily.find((d) => d.date === selected) : undefined
            }
            selectedEntries={selectedEntries}
            hrefFor={hrefFor}
          />
        )}
      </main>
    </>
  );
}
