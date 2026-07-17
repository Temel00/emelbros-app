/**
 * Cadence, "due today", and streak derivation (docs/modules/habits.md §3).
 * Pure functions only — streaks and due-today are never stored, so callers
 * recompute them at read time from a trackable's logs (backfills/edits just
 * change the input, no separate recompute step).
 */

export type Cadence =
  | { type: "daily" }
  | { type: "weekly"; target: number }
  | { type: "weekdays"; weekdays: number[] }; // ISO weekday numbers, 1 (Mon) – 7 (Sun)

export type DayLog = {
  /** ISO date string, "YYYY-MM-DD". */
  date: string;
  done: boolean;
};

function isoWeekday(date: Date): number {
  const day = date.getUTCDay(); // 0 (Sun) – 6 (Sat)
  return day === 0 ? 7 : day;
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseISODate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function addDays(date: Date, delta: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + delta);
  return next;
}

/** Monday of the ISO week containing `date`. */
function weekStart(date: Date): Date {
  return addDays(date, -(isoWeekday(date) - 1));
}

function isScheduledDay(cadence: Cadence, date: Date): boolean {
  switch (cadence.type) {
    case "daily":
    case "weekly":
      return true;
    case "weekdays":
      return cadence.weekdays.includes(isoWeekday(date));
  }
}

function countDoneInWeek(
  logsByDate: Map<string, DayLog>,
  weekStartDate: Date,
): number {
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const log = logsByDate.get(toISODate(addDays(weekStartDate, i)));
    if (log?.done) count++;
  }
  return count;
}

/**
 * Whether a scheduled trackable is due on `today` and not yet logged done
 * (docs/modules/habits.md §3). `weekly` is "due" until the week's target is
 * met; `weekdays` is due only on its listed weekdays; `daily` is always due.
 */
export function isDueToday(
  cadence: Cadence,
  logs: DayLog[],
  today: Date,
): boolean {
  const byDate = new Map(logs.map((log) => [log.date, log]));
  if (byDate.get(toISODate(today))?.done) return false;

  if (cadence.type === "weekly") {
    return countDoneInWeek(byDate, weekStart(today)) < cadence.target;
  }
  return isScheduledDay(cadence, today);
}

/**
 * The current run of met periods counting back from `today`, derived at
 * read time from `logs` (docs/modules/habits.md §3). Today itself is never
 * what breaks a streak — an unlogged-so-far today is "at risk", not a miss,
 * since the day isn't over; a scheduled period before today that was missed
 * ends the count there.
 */
export function computeStreak(
  cadence: Cadence,
  logs: DayLog[],
  today: Date,
): number {
  if (cadence.type === "weekly") {
    return computeWeeklyStreak(cadence, logs, today);
  }

  const byDate = new Map(logs.map((log) => [log.date, log]));
  const todayStr = toISODate(today);
  let streak = 0;
  let cursor = today;

  while (true) {
    if (isScheduledDay(cadence, cursor)) {
      const cursorStr = toISODate(cursor);
      const done = byDate.get(cursorStr)?.done ?? false;
      if (done) {
        streak++;
      } else if (cursorStr !== todayStr) {
        break;
      }
      // else: today, not yet logged — grace, no increment, no break.
    }
    cursor = addDays(cursor, -1);
  }

  return streak;
}

function computeWeeklyStreak(
  cadence: Extract<Cadence, { type: "weekly" }>,
  logs: DayLog[],
  today: Date,
): number {
  const byDate = new Map(logs.map((log) => [log.date, log]));
  let streak = 0;
  let ws = weekStart(today);
  let isCurrentWeek = true;

  while (true) {
    const met = countDoneInWeek(byDate, ws) >= cadence.target;
    if (met) {
      streak++;
    } else if (!isCurrentWeek) {
      break;
    }
    // else: the current week hasn't hit target yet — grace, week isn't over.

    isCurrentWeek = false;
    ws = addDays(ws, -7);
  }

  return streak;
}

/** Converts a `habits_trackable` row's cadence columns to a `Cadence`, or `null` for unscheduled kinds. */
export function toCadence(trackable: {
  cadence_type: string | null;
  cadence_target: number | null;
  cadence_weekdays: number[] | null;
}): Cadence | null {
  switch (trackable.cadence_type) {
    case "daily":
      return { type: "daily" };
    case "weekly":
      return { type: "weekly", target: trackable.cadence_target ?? 0 };
    case "weekdays":
      return {
        type: "weekdays",
        weekdays: trackable.cadence_weekdays ?? [],
      };
    default:
      return null;
  }
}

export { parseISODate, toISODate };
