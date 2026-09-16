/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Mock `nutrition_log`-derived totals shared by the trend-view and widget
 * variants. Shaped to match the real (unmerged) `computeOverviewTotals`
 * output on task/124-nutrition-overview-totals
 * (modules/nutrition/lib/overview-totals.ts) exactly for `daily`/`weekly` —
 * ascending order, macros `null` (not 0) until the first contributing day.
 *
 * RESOLVED DURING THE LIVE CONVERSATION: the real `computeOverviewTotals`
 * has no `monthly` bucket. Decision — give it one (a first-class `monthly`
 * array, same null-until-first-entry semantics as daily/weekly), but
 * implement it exactly as `rollUpMonthly` below does: grouped from the
 * already-computed `daily` rows, not a second scan over `nutrition_log`.
 * Own bucket for the API shape; rollup for the implementation.
 */

export type MacroTotals = {
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

export type DailyTotal = { date: string } & MacroTotals; // "YYYY-MM-DD"
export type WeeklyTotal = { weekStart: string } & MacroTotals; // ISO Monday date
export type MonthlyTotal = { monthStart: string } & MacroTotals; // "YYYY-MM-01" — prototype-only rollup, see file header

export type OverviewRange = "day" | "week" | "month";

/**
 * Default per-day macro/calorie goals for the week view's guideline feature.
 * No real goal-setting exists yet (out of scope for #125) — these are fixed
 * placeholder numbers so the guideline visual has something to draw.
 */
export const DEFAULT_GOALS: MacroTotals = {
  calories: 2200,
  proteinG: 160,
  carbsG: 220,
  fatG: 70,
};

export type MockPlanEntry = {
  id: string;
  mealSlot: string;
  title: string;
  cookedAt: string | null;
  servingsPlanned: number;
};

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function weekStartOf(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return toISODate(d);
}

export function monthStartOf(dateIso: string): string {
  return `${dateIso.slice(0, 7)}-01`;
}

export function fullDateLabel(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function weekdayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString(undefined, {
    weekday: "short",
    timeZone: "UTC",
  });
}

export function monthLabel(monthStart: string): string {
  return new Date(`${monthStart}T00:00:00.000Z`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function weekRangeLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function datesOfWeek(weekStart: string): string[] {
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

/** Monday-first grid of a month's dates, padded with nulls to align weekdays. */
export function monthGridDays(monthStart: string): (string | null)[] {
  const start = new Date(`${monthStart}T00:00:00.000Z`);
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstWeekday = start.getUTCDay();
  const leadingBlanks = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const cells: (string | null)[] = Array(leadingBlanks).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10));
  }
  return cells;
}

/** Deterministic pseudo-random so the same day always renders the same bar. */
export function seededValue(seed: number, min: number, max: number): number {
  const x = Math.sin(seed) * 10000;
  const frac = x - Math.floor(x);
  return Math.round(min + frac * (max - min));
}

/**
 * `daysBack` days of history ending today, with roughly 1 in 6 days left
 * fully unlogged (macros null) so the "gap" case is always present, not just
 * at the thin-history edges. The oldest 5 days are always unlogged too —
 * carousel back far enough (day view) or into the first week (week view) and
 * you hit "before I started tracking" without a separate scenario toggle.
 */
function buildDailyTotals(daysBack: number, todayIso: string): DailyTotal[] {
  const today = new Date(`${todayIso}T00:00:00.000Z`);
  const days: DailyTotal[] = [];

  for (let i = daysBack - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const date = toISODate(d);
    const seed = d.getUTCDate() + d.getUTCMonth() * 31;

    const beforeTrackingBegan = i >= daysBack - 5;
    const logged = !beforeTrackingBegan && seededValue(seed, 0, 100) >= 16; // ~84% of days logged
    days.push(
      logged
        ? {
            date,
            calories: seededValue(seed * 1.7, 1500, 2600),
            proteinG: seededValue(seed * 2.3, 70, 170),
            carbsG: seededValue(seed * 3.1, 120, 320),
            fatG: seededValue(seed * 4.9, 40, 110),
          }
        : { date, calories: null, proteinG: null, carbsG: null, fatG: null },
    );
  }

  return days;
}

const ENTRY_TITLES = [
  "Greek yoghurt & berries",
  "Grilled chicken bowl",
  "Protein shake",
  "Salmon + rice",
  "Oatmeal & peanut butter",
  "Turkey sandwich",
  "Veggie stir fry",
  "Eggs & toast",
];

export type DayEntry = {
  id: string;
  title: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

/**
 * Per-food breakdown for a single day, split from that day's totals so the
 * numbers stay consistent with the bar/table views. Rough proportional
 * split, not a real recipe-nutrition join — good enough to react to "can I
 * see which food contributed which macros."
 */
export function buildMockDayEntries(day: DailyTotal): DayEntry[] {
  if (day.calories === null) return [];

  const seed = new Date(`${day.date}T00:00:00.000Z`).getUTCDate();
  const count = seededValue(seed * 5.1, 2, 4);
  const weights = Array.from({ length: count }, (_, i) =>
    seededValue(seed * (i + 2) * 1.3, 10, 40),
  );
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  return weights.map((w, i) => {
    const frac = w / totalWeight;
    return {
      id: `${day.date}-${i}`,
      title: ENTRY_TITLES[(seed + i) % ENTRY_TITLES.length],
      calories: Math.round(day.calories! * frac),
      proteinG: Math.round((day.proteinG ?? 0) * frac),
      carbsG: Math.round((day.carbsG ?? 0) * frac),
      fatG: Math.round((day.fatG ?? 0) * frac),
    };
  });
}

/** Average over days that were actually logged — null days don't count as 0. */
export function averageOf(
  days: DailyTotal[],
  field: "calories" | "proteinG" | "carbsG" | "fatG",
): number | null {
  const logged = days
    .map((d) => d[field])
    .filter((v): v is number => v !== null);
  if (logged.length === 0) return null;
  return Math.round(logged.reduce((a, b) => a + b, 0) / logged.length);
}

function rollUpWeekly(daily: DailyTotal[]): WeeklyTotal[] {
  const buckets = new Map<string, DailyTotal[]>();
  for (const day of daily) {
    const weekStart = weekStartOf(new Date(`${day.date}T00:00:00.000Z`));
    const bucket = buckets.get(weekStart) ?? [];
    bucket.push(day);
    buckets.set(weekStart, bucket);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, days]) => sumBucket(days, { weekStart }));
}

function rollUpMonthly(daily: DailyTotal[]): MonthlyTotal[] {
  const buckets = new Map<string, DailyTotal[]>();
  for (const day of daily) {
    const monthStart = monthStartOf(day.date);
    const bucket = buckets.get(monthStart) ?? [];
    bucket.push(day);
    buckets.set(monthStart, bucket);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthStart, days]) => sumBucket(days, { monthStart }));
}

function sumBucket<K extends string, V extends string>(
  days: DailyTotal[],
  key: Record<K, V>,
): {
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
} & Record<K, V> {
  let calories: number | null = null;
  let proteinG: number | null = null;
  let carbsG: number | null = null;
  let fatG: number | null = null;

  for (const day of days) {
    if (day.calories !== null) calories = (calories ?? 0) + day.calories;
    if (day.proteinG !== null) proteinG = (proteinG ?? 0) + day.proteinG;
    if (day.carbsG !== null) carbsG = (carbsG ?? 0) + day.carbsG;
    if (day.fatG !== null) fatG = (fatG ?? 0) + day.fatG;
  }

  return { ...key, calories, proteinG, carbsG, fatG };
}

export type MockOverview = {
  daily: DailyTotal[];
  weekly: WeeklyTotal[];
  monthly: MonthlyTotal[];
};

/**
 * ~14 weeks of continuous history ending today (enough to carousel back
 * through several months), replacing the old established/week-one/day-one
 * scenario toggle per live feedback — the "before I started tracking" and
 * scattered-gap thin states are now just part of one history you carousel
 * into, instead of a separate switch.
 */
export function buildMockOverview(
  todayIso = toISODate(new Date()),
): MockOverview {
  const daily = buildDailyTotals(98, todayIso);
  return { daily, weekly: rollUpWeekly(daily), monthly: rollUpMonthly(daily) };
}

const MOCK_PLAN: MockPlanEntry[] = [
  {
    id: "plan-1",
    mealSlot: "breakfast",
    title: "Greek yoghurt & berries",
    cookedAt: new Date().toISOString(),
    servingsPlanned: 1,
  },
  {
    id: "plan-2",
    mealSlot: "lunch",
    title: "Chicken & rice bowl",
    cookedAt: null,
    servingsPlanned: 2,
  },
  {
    id: "plan-3",
    mealSlot: "dinner",
    title: "Weeknight garlic pasta",
    cookedAt: null,
    servingsPlanned: 4,
  },
];

export function buildMockTodaysPlan(): MockPlanEntry[] {
  return MOCK_PLAN;
}

/** Today's logged-so-far calories for the widget — independent of the plan above. */
export function buildMockCaloriesToday(): number {
  return 1180;
}
