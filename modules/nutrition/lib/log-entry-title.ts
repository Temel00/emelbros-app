import type { LogEntryWithSource } from "@/modules/nutrition/queries";

/**
 * Date math and title resolution for the overview day view's log list
 * (nutrition.md §3.6, wayfinder #126) — deliberately independent of
 * `task/123-nutrition-log-ui`'s unmerged `log-display.ts`.
 */

/** The calendar day after `date` (UTC), for a half-open `[date, nextDate)` range bound. */
export function nextIsoDate(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Resolves a log entry's display title: the food it was logged against, or
 * the recipe it was logged against, or the freeform description, or a
 * fallback for the rare row with none of the three (mirrors
 * `plan-calendar.ts`'s `entryTitle` for meal plan entries).
 */
export function logEntryTitle(entry: LogEntryWithSource): string {
  return (
    entry.food?.name ??
    entry.recipe?.title ??
    entry.description ??
    "Untitled entry"
  );
}
