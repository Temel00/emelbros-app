/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #122 resolves.
 *
 * Mock `nutrition_log`-shaped state shared by the three UI variants. Foods,
 * recipes, and today's meal-plan entries are the real rows the page fetches
 * read-only, so the owner reacts to their own kitchen's data — but the log
 * *entries* themselves (what's been logged today, at what portion, with
 * what macros) are invented in memory here. Nothing in this file reads or
 * writes `nutrition_log`; #121 already built that table and its query
 * layer, but wiring to it is what this ticket is answering the shape for.
 *
 * `nutrition_recipe` carries no macro columns of its own (only
 * `nutrition_food` does — nutrition.md's per-food facts), so a cooked-meal
 * log entry's macros here are a deterministic *fake* estimate for display
 * only. Real recipe-derived totals are wayfinder #124's job, not this one.
 */
import type {
  FoodRow,
  MealPlanEntryWithRecipe,
  RecipeRow,
} from "@/modules/nutrition/queries";

export type LogSource = "recipe" | "food" | "freeform";

export type RoughGuessSize = "small" | "medium" | "large";

export const ROUGH_GUESS_MACROS: Record<
  RoughGuessSize,
  {
    label: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  }
> = {
  small: {
    label: "Small bite (~200 kcal)",
    calories: 200,
    protein_g: 8,
    carbs_g: 22,
    fat_g: 8,
  },
  medium: {
    label: "Medium plate (~500 kcal)",
    calories: 500,
    protein_g: 25,
    carbs_g: 55,
    fat_g: 18,
  },
  large: {
    label: "Big meal (~800 kcal)",
    calories: 800,
    protein_g: 40,
    carbs_g: 90,
    fat_g: 30,
  },
};

export type MockLogEntry = {
  id: string;
  loggedAt: string; // ISO timestamp
  source: LogSource;
  /** What the row shows — recipe title, food name, or the freeform text. */
  displayText: string;
  /** One-line detail under the display text — portion, quantity+unit, or the rough-guess size. */
  detail: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  // Enough of the original selection to support "log again" and editing.
  recipeId?: string;
  portionMultiplier?: number;
  foodId?: string;
  quantity?: number;
  unit?: string;
  roughGuess?: RoughGuessSize;
};

let mockIdCounter = 1000;
function mockId() {
  mockIdCounter += 1;
  return `mock-log-${mockIdCounter}`;
}

/** Deterministic fake per-serving macros for a recipe — display only, see file header. */
export function estimateRecipeMacros(recipe: RecipeRow) {
  const seed = recipe.title.length + recipe.servings;
  const calories = 320 + ((seed * 37) % 380);
  return {
    calories,
    protein_g: 12 + ((seed * 7) % 28),
    carbs_g: 20 + ((seed * 11) % 50),
    fat_g: 8 + ((seed * 5) % 20),
  };
}

export function computeFoodMacros(food: FoodRow, quantity: number) {
  return {
    calories: Math.round(food.calories_per_unit * quantity),
    protein_g: Math.round(food.protein_g_per_unit * quantity),
    carbs_g: Math.round(food.carbs_g_per_unit * quantity),
    fat_g: Math.round(food.fat_g_per_unit * quantity),
  };
}

export function recipeLogEntry(
  recipe: RecipeRow,
  portionMultiplier: number,
  loggedAt = new Date().toISOString(),
): MockLogEntry {
  const base = estimateRecipeMacros(recipe);
  const scale = (n: number) => Math.round(n * portionMultiplier);
  return {
    id: mockId(),
    loggedAt,
    source: "recipe",
    displayText: recipe.title,
    detail:
      portionMultiplier === 1
        ? "1 planned portion"
        : `${portionMultiplier}× planned portion`,
    calories: scale(base.calories),
    protein_g: scale(base.protein_g),
    carbs_g: scale(base.carbs_g),
    fat_g: scale(base.fat_g),
    recipeId: recipe.id,
    portionMultiplier,
  };
}

export function foodLogEntry(
  food: FoodRow,
  quantity: number,
  loggedAt = new Date().toISOString(),
): MockLogEntry {
  const macros = computeFoodMacros(food, quantity);
  return {
    id: mockId(),
    loggedAt,
    source: "food",
    displayText: food.brand ? `${food.name} (${food.brand})` : food.name,
    detail: `${quantity} ${food.unit}`,
    ...macros,
    foodId: food.id,
    quantity,
    unit: food.unit,
  };
}

export function freeformLogEntry(
  description: string,
  guess: RoughGuessSize,
  loggedAt = new Date().toISOString(),
): MockLogEntry {
  const macros = ROUGH_GUESS_MACROS[guess];
  return {
    id: mockId(),
    loggedAt,
    source: "freeform",
    displayText: description,
    detail: macros.label,
    calories: macros.calories,
    protein_g: macros.protein_g,
    carbs_g: macros.carbs_g,
    fat_g: macros.fat_g,
    roughGuess: guess,
  };
}

/** A handful of already-logged entries so the day list is never empty on load. */
export function buildSeedEntries(
  foods: FoodRow[],
  recipes: RecipeRow[],
): MockLogEntry[] {
  const entries: MockLogEntry[] = [];
  const now = Date.now();

  const breakfastRecipe = recipes[0];
  if (breakfastRecipe) {
    entries.push(
      recipeLogEntry(
        breakfastRecipe,
        1,
        new Date(now - 5 * 60 * 60 * 1000).toISOString(),
      ),
    );
  }

  const snackFood = foods[0];
  if (snackFood) {
    entries.push(
      foodLogEntry(
        snackFood,
        1,
        new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      ),
    );
  }

  return entries.sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
}

/**
 * "Frequent/recent" chips for one-tap repeat logging — the fastest path the
 * ticket asks for. Mocked from whatever foods/recipes exist rather than
 * derived from real log history, since that history doesn't exist yet.
 */
export function buildFrequentPicks(foods: FoodRow[], recipes: RecipeRow[]) {
  return {
    foods: foods.slice(0, 3),
    recipes: recipes.slice(0, 2),
  };
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function todaysMealPlanEntries(
  entries: MealPlanEntryWithRecipe[],
): MealPlanEntryWithRecipe[] {
  const todayIso = new Date().toISOString().slice(0, 10);
  return entries.filter((e) => e.plan_date === todayIso);
}
