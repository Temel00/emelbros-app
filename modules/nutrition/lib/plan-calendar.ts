import type { MealPlanEntryWithRecipe } from "@/modules/nutrition/queries";

/**
 * Date math and entry grouping for the meal plan week/month calendar
 * (nutrition.md §3.4, wayfinder #117), ported from the settled prototype
 * (#116, prototype-meal-plan-shared.tsx) to operate on the real
 * `MealPlanEntryWithRecipe` shape instead of the prototype's mock entries.
 */

export type PlanDay = {
  date: string;
  label: string;
  dayOfMonth: string;
  dayNumber: number;
};

export type MonthDay = {
  date: string;
  dayNumber: number;
  inCurrentMonth: boolean;
};

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Today's date, as of the call — a function, not a stale module constant. */
export function todayIso(): string {
  return toIsoDate(new Date());
}

/** Parses a `plan_date` as local midnight, not UTC midnight. */
export function parseIsoDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** Monday of the week containing `from` — the week the calendar opens on. */
export function getWeekDays(from = new Date()): PlanDay[] {
  const day = from.getDay(); // 0 = Sunday
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(from);
  monday.setDate(from.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      date: toIsoDate(d),
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
      dayOfMonth: d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      dayNumber: d.getDate(),
    };
  });
}

/**
 * A Monday-aligned 6-week grid covering the month containing `from` —
 * enough rows for any month regardless of where it starts, matching
 * Google/Apple calendar's month view. Leading/trailing days from the
 * neighbouring months are included (`inCurrentMonth: false`) so the grid
 * never has ragged edges.
 */
export function getMonthGrid(from = new Date()): MonthDay[][] {
  const monthStart = new Date(from.getFullYear(), from.getMonth(), 1);
  const startDay = monthStart.getDay();
  const leadingDays = startDay === 0 ? 6 : startDay - 1;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - leadingDays);

  const weeks: MonthDay[][] = [];
  for (let week = 0; week < 6; week++) {
    const row: MonthDay[] = [];
    for (let day = 0; day < 7; day++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + week * 7 + day);
      row.push({
        date: toIsoDate(d),
        dayNumber: d.getDate(),
        inCurrentMonth: d.getMonth() === from.getMonth(),
      });
    }
    weeks.push(row);
  }
  return weeks;
}

export function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

export function addWeeks(d: Date, delta: number): Date {
  const next = new Date(d);
  next.setDate(d.getDate() + delta * 7);
  return next;
}

/** The inclusive date range a week view needs fetched. */
export function weekRange(from = new Date()): { start: string; end: string } {
  const days = getWeekDays(from);
  return { start: days[0].date, end: days[6].date };
}

/** The inclusive date range a month grid needs fetched — the full 42-day grid, not just the calendar month, since leading/trailing days are shown too. */
export function monthRange(from = new Date()): { start: string; end: string } {
  const grid = getMonthGrid(from);
  const flat = grid.flat();
  return { start: flat[0].date, end: flat[flat.length - 1].date };
}

export function entriesOnDate(
  entries: MealPlanEntryWithRecipe[],
  date: string,
): MealPlanEntryWithRecipe[] {
  return entries.filter((entry) => entry.plan_date === date);
}

export function entriesAt(
  entries: MealPlanEntryWithRecipe[],
  date: string,
  slot: string,
): MealPlanEntryWithRecipe[] {
  return entries.filter(
    (entry) => entry.plan_date === date && entry.meal_slot === slot,
  );
}

export function entryTitle(entry: MealPlanEntryWithRecipe): string {
  return entry.recipe?.title ?? entry.freeform_title ?? "Untitled";
}
