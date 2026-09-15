/**
 * Macro computation for a log entry (docs/modules/nutrition.md §3.5, §10,
 * #121's scope). The three logging paths each arrive at the macros to
 * snapshot onto the row differently — this is the pure part of each; the
 * action only fetches the food/recipe data and writes the result.
 *
 * The output is always a snapshot (§3.5): once computed here, these numbers
 * are what gets written to `nutrition_log`, never a live join re-derived
 * later. Correcting a food's calories afterwards must not change a
 * previously logged entry.
 */

export type Macros = {
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

export type RecipeIngredientForMacros = {
  foodId: string | null;
  quantity: number | null;
  unit: string | null;
};

export type FoodMacroRates = {
  id: string;
  unit: string;
  caloriesPerUnit: number;
  proteinGPerUnit: number;
  carbsGPerUnit: number;
  fatGPerUnit: number;
};

export type MacroSource =
  | {
      /** From a cooked meal plan entry: the recipe's per-serving macros, scaled to the portion actually logged. */
      kind: "cookedMeal";
      recipeServings: number;
      portionServings: number;
      ingredients: readonly RecipeIngredientForMacros[];
      foods: readonly FoodMacroRates[];
    }
  | {
      /** From the food dictionary: quantity times the food's per-unit values. */
      kind: "food";
      quantity: number;
      food: FoodMacroRates;
    }
  | {
      /** Freeform: a description carries optional rough macros, entered directly — nothing to compute. */
      kind: "freeform";
      calories: number | null;
      proteinG: number | null;
      carbsG: number | null;
      fatG: number | null;
    };

const ZERO_MACROS: Macros = {
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
};

function addMacros(a: Macros, b: Macros): Macros {
  return {
    calories: (a.calories ?? 0) + (b.calories ?? 0),
    proteinG: (a.proteinG ?? 0) + (b.proteinG ?? 0),
    carbsG: (a.carbsG ?? 0) + (b.carbsG ?? 0),
    fatG: (a.fatG ?? 0) + (b.fatG ?? 0),
  };
}

function scaleMacros(macros: Macros, factor: number): Macros {
  return {
    calories: macros.calories === null ? null : macros.calories * factor,
    proteinG: macros.proteinG === null ? null : macros.proteinG * factor,
    carbsG: macros.carbsG === null ? null : macros.carbsG * factor,
    fatG: macros.fatG === null ? null : macros.fatG * factor,
  };
}

/**
 * A recipe line's macros: quantity times the linked food's per-unit rates.
 * Skipped (contributes nothing) when unlinked, unquantified, or the food's
 * rates aren't in `foods` at all, or are in a different unit — v1 does no
 * unit conversion (§8), the same rule the pantry-decrement and
 * shopping-list math already follow.
 */
function ingredientMacros(
  line: RecipeIngredientForMacros,
  foods: readonly FoodMacroRates[],
): Macros {
  if (line.foodId === null || line.quantity === null) return ZERO_MACROS;

  const food = foods.find(
    (candidate) => candidate.id === line.foodId && candidate.unit === line.unit,
  );
  if (!food) return ZERO_MACROS;

  return {
    calories: line.quantity * food.caloriesPerUnit,
    proteinG: line.quantity * food.proteinGPerUnit,
    carbsG: line.quantity * food.carbsGPerUnit,
    fatG: line.quantity * food.fatGPerUnit,
  };
}

/**
 * A recipe's macros for one serving: its ingredient lines' macros, summed
 * then divided across the recipe's own servings count.
 */
function perServingMacros(
  recipeServings: number,
  ingredients: readonly RecipeIngredientForMacros[],
  foods: readonly FoodMacroRates[],
): Macros {
  const total = ingredients.reduce(
    (sum, line) => addMacros(sum, ingredientMacros(line, foods)),
    ZERO_MACROS,
  );
  return scaleMacros(total, 1 / recipeServings);
}

export function computeLogMacros(source: MacroSource): Macros {
  switch (source.kind) {
    case "cookedMeal": {
      const perServing = perServingMacros(
        source.recipeServings,
        source.ingredients,
        source.foods,
      );
      return scaleMacros(perServing, source.portionServings);
    }
    case "food":
      return {
        calories: source.quantity * source.food.caloriesPerUnit,
        proteinG: source.quantity * source.food.proteinGPerUnit,
        carbsG: source.quantity * source.food.carbsGPerUnit,
        fatG: source.quantity * source.food.fatGPerUnit,
      };
    case "freeform":
      return {
        calories: source.calories,
        proteinG: source.proteinG,
        carbsG: source.carbsG,
        fatG: source.fatG,
      };
  }
}
