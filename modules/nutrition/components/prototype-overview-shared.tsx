/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Mock `nutrition_log`-derived totals shared by the trend-view and widget
 * variants. Shaped to match the real (unmerged) `computeOverviewTotals`
 * output on task/124-nutrition-overview-totals
 * (modules/nutrition/lib/overview-totals.ts) exactly for `daily`/`weekly` —
 * ascending order, macros `null` (not 0) until the first contributing day.
 *
 * OPEN QUESTION (flagged for the live conversation): the real
 * `computeOverviewTotals` has no `monthly` bucket. `monthlyTotals` below is
 * a client-side rollup of the daily data, invented for this prototype only,
 * to test whether that's an acceptable shape or whether month needs its own
 * bucket added to the real function.
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

function weekStartOf(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return toISODate(d);
}

function monthStartOf(dateIso: string): string {
  return `${dateIso.slice(0, 7)}-01`;
}

/** Deterministic pseudo-random so the same day always renders the same bar. */
function seededValue(seed: number, min: number, max: number): number {
  const x = Math.sin(seed) * 10000;
  const frac = x - Math.floor(x);
  return Math.round(min + frac * (max - min));
}

/**
 * `daysBack` days of history ending today, with roughly 1 in 6 days left
 * fully unlogged (macros null) so the "gap" case is always present, not just
 * at the thin-history edges.
 */
function buildDailyTotals(daysBack: number, todayIso: string): DailyTotal[] {
  const today = new Date(`${todayIso}T00:00:00.000Z`);
  const days: DailyTotal[] = [];

  for (let i = daysBack - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const date = toISODate(d);
    const seed = d.getUTCDate() + d.getUTCMonth() * 31;

    const logged = seededValue(seed, 0, 100) >= 16; // ~84% of days logged
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

export type OverviewScenario = "established" | "week-one" | "day-one";

export type MockOverview = {
  daily: DailyTotal[];
  weekly: WeeklyTotal[];
  monthly: MonthlyTotal[];
};

/**
 * Three data scenarios to react to alongside the three layout variants —
 * per UI.md's requirement to make the thin/early states explicit rather
 * than assuming the chart form handles them gracefully.
 */
export function buildMockOverview(
  scenario: OverviewScenario,
  todayIso = toISODate(new Date()),
): MockOverview {
  const daysBack =
    scenario === "established" ? 42 : scenario === "week-one" ? 4 : 1;
  const daily = buildDailyTotals(daysBack, todayIso);
  return { daily, weekly: rollUpWeekly(daily), monthly: rollUpMonthly(daily) };
}

export const SCENARIOS: { key: OverviewScenario; label: string }[] = [
  { key: "established", label: "6 weeks of history" },
  { key: "week-one", label: "Week one (4 days logged)" },
  { key: "day-one", label: "Day one (1 entry)" },
];

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
