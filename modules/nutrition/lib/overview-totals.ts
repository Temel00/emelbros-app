/**
 * Daily & weekly totals for the nutrition overview (docs/modules/nutrition.md
 * §3.6, §10, #124's scope). Pure aggregation over `nutrition_log` rows —
 * never stored, always derived at read time from the range's rows, mirroring
 * how `modules/habits/lib/cadence.ts` derives streaks from raw logs rather
 * than a cached counter. Editing or backfilling a log entry changes only the
 * input here, so the trend recomputes for free with no separate recompute
 * step and no stale aggregate to invalidate.
 *
 * This is a trend view, not a goals feature (§8): there is no target here to
 * compare a total against, only the totals themselves.
 */

export type MacroTotals = {
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

export type LogEntryForTotals = {
  /** ISO timestamp — only the date portion (UTC) buckets the entry. */
  logged_at: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
};

export type DailyTotal = {
  /** ISO date, "YYYY-MM-DD". */
  date: string;
} & MacroTotals;

export type WeeklyTotal = {
  /** ISO date of the Monday starting this week. */
  weekStart: string;
} & MacroTotals;

export type OverviewTotals = {
  daily: DailyTotal[];
  weekly: WeeklyTotal[];
};

const ZERO_TOTALS: MacroTotals = {
  calories: null,
  proteinG: null,
  carbsG: null,
  fatG: null,
};

/**
 * Adds one entry's macros into a running total. A macro stays `null` until
 * the first entry that actually carries a value for it — the freeform
 * logging path allows null macros (§3.5), and a day where every entry
 * omitted, say, fat should show as "no data" rather than a false zero.
 */
function addEntry(totals: MacroTotals, entry: LogEntryForTotals): MacroTotals {
  return {
    calories: addNullable(totals.calories, entry.calories),
    proteinG: addNullable(totals.proteinG, entry.protein_g),
    carbsG: addNullable(totals.carbsG, entry.carbs_g),
    fatG: addNullable(totals.fatG, entry.fat_g),
  };
}

function addNullable(sum: number | null, value: number | null): number | null {
  if (value === null) return sum;
  return (sum ?? 0) + value;
}

function toISODate(iso: string): string {
  return iso.slice(0, 10);
}

/** Monday of the ISO week containing `date` (a "YYYY-MM-DD" string). */
function weekStartOf(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const isoWeekday = d.getUTCDay() === 0 ? 7 : d.getUTCDay(); // 1 (Mon) – 7 (Sun)
  d.setUTCDate(d.getUTCDate() - (isoWeekday - 1));
  return d.toISOString().slice(0, 10);
}

/**
 * Buckets `entries` (already scoped to one member and a date range by the
 * caller's query — this function does no filtering of its own) into daily
 * and weekly macro totals, sorted ascending. A day or week with no entries
 * simply has no bucket, rather than a zeroed-out one.
 */
export function computeOverviewTotals(
  entries: readonly LogEntryForTotals[],
): OverviewTotals {
  const byDay = new Map<string, MacroTotals>();
  const byWeek = new Map<string, MacroTotals>();

  for (const entry of entries) {
    const date = toISODate(entry.logged_at);
    byDay.set(date, addEntry(byDay.get(date) ?? ZERO_TOTALS, entry));

    const week = weekStartOf(date);
    byWeek.set(week, addEntry(byWeek.get(week) ?? ZERO_TOTALS, entry));
  }

  const daily = [...byDay.entries()]
    .map(([date, totals]) => ({ date, ...totals }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const weekly = [...byWeek.entries()]
    .map(([weekStart, totals]) => ({ weekStart, ...totals }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  return { daily, weekly };
}
