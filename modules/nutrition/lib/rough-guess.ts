/**
 * Rough-guess macro presets for the freeform logging panel
 * (nutrition.md §3.5, prototype #122 resolution). `nutrition_log` has no
 * column for which preset was picked — these are pure input convenience,
 * not a persisted category, so a freeform entry's macros are whatever the
 * chosen preset (or a manual override) resolved to at write time.
 */

export type RoughGuessSize = "small" | "medium" | "large";

export type RoughGuessMacros = {
  label: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export const ROUGH_GUESS_MACROS: Record<RoughGuessSize, RoughGuessMacros> = {
  small: {
    label: "Small bite (~200 kcal)",
    calories: 200,
    proteinG: 8,
    carbsG: 22,
    fatG: 8,
  },
  medium: {
    label: "Medium plate (~500 kcal)",
    calories: 500,
    proteinG: 25,
    carbsG: 55,
    fatG: 18,
  },
  large: {
    label: "Big meal (~800 kcal)",
    calories: 800,
    proteinG: 40,
    carbsG: 90,
    fatG: 30,
  },
};
