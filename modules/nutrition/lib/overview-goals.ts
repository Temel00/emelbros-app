import type { DailyTotal, MacroTotals } from "@/modules/nutrition/lib/overview-totals";

/**
 * Fixed placeholder per-day macro/calorie goals for the overview's
 * goal-guideline visual (nutrition.md §8, wayfinder #125's resolution,
 * carried into #126's brief). No goal-setting feature exists — these are
 * hardcoded numbers so the guideline has something to draw against, not a
 * value a member can change.
 */
export const DEFAULT_GOALS = {
  calories: 2200,
  proteinG: 160,
  carbsG: 220,
  fatG: 70,
} satisfies MacroTotals;

/**
 * Macro goal-setting model: a fixed % of the calorie goal per macro
 * (protein/carbs 4 kcal/g, fat 9 kcal/g).
 */
export const MACRO_GOAL_PERCENTS = {
  proteinPct: 0.4,
  carbsPct: 0.3,
  fatPct: 0.3,
} as const;

export function macroGramGoalsFromCalories(caloriesGoal: number): {
  proteinG: number;
  carbsG: number;
  fatG: number;
} {
  return {
    proteinG: Math.round((caloriesGoal * MACRO_GOAL_PERCENTS.proteinPct) / 4),
    carbsG: Math.round((caloriesGoal * MACRO_GOAL_PERCENTS.carbsPct) / 4),
    fatG: Math.round((caloriesGoal * MACRO_GOAL_PERCENTS.fatPct) / 9),
  };
}

/** Average over days that were actually logged — a `null` day doesn't count as 0. */
export function averageOf(
  days: readonly DailyTotal[],
  field: "calories" | "proteinG" | "carbsG" | "fatG",
): number | null {
  const logged = days
    .map((d) => d[field])
    .filter((v): v is number => v !== null);
  if (logged.length === 0) return null;
  return Math.round(logged.reduce((a, b) => a + b, 0) / logged.length);
}
