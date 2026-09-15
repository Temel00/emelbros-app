import { describe, expect, it } from "vitest";

import { computeLogMacros } from "@/modules/nutrition/lib/macro-computation";

describe("computeLogMacros", () => {
  it("computes a cooked meal's macros for a full serving from its recipe's ingredients", () => {
    // Recipe serves 2, one ingredient line: 500g flour at 3.8 kcal/g, 0.13
    // g protein/g, 0.68 g carbs/g, 0.07 g fat/g. Totals: 1900 kcal, 65g
    // protein, 340g carbs, 35g fat — halved for one serving.
    const macros = computeLogMacros({
      kind: "cookedMeal",
      recipeServings: 2,
      portionServings: 1,
      ingredients: [{ foodId: "flour", quantity: 500, unit: "g" }],
      foods: [
        {
          id: "flour",
          unit: "g",
          caloriesPerUnit: 3.8,
          proteinGPerUnit: 0.13,
          carbsGPerUnit: 0.68,
          fatGPerUnit: 0.07,
        },
      ],
    });

    expect(macros).toEqual({
      calories: 950,
      proteinG: 32.5,
      carbsG: 170,
      fatG: 17.5,
    });
  });

  it("scales a cooked meal's macros for a portion other than one full serving", () => {
    // Same recipe, but this cook is logging 1.5 servings' worth.
    const macros = computeLogMacros({
      kind: "cookedMeal",
      recipeServings: 2,
      portionServings: 1.5,
      ingredients: [{ foodId: "flour", quantity: 500, unit: "g" }],
      foods: [
        {
          id: "flour",
          unit: "g",
          caloriesPerUnit: 3.8,
          proteinGPerUnit: 0.13,
          carbsGPerUnit: 0.68,
          fatGPerUnit: 0.07,
        },
      ],
    });

    expect(macros).toEqual({
      calories: 1425,
      proteinG: 48.75,
      carbsG: 255,
      fatG: 26.25,
    });
  });

  it("skips a cooked meal's ingredient line with no food link, no quantity, or an unmatched food/unit", () => {
    const macros = computeLogMacros({
      kind: "cookedMeal",
      recipeServings: 1,
      portionServings: 1,
      ingredients: [
        { foodId: null, quantity: 100, unit: "g" },
        { foodId: "flour", quantity: null, unit: "g" },
        { foodId: "flour", quantity: 100, unit: "ml" },
        { foodId: "flour", quantity: 100, unit: "g" },
      ],
      foods: [
        {
          id: "flour",
          unit: "g",
          caloriesPerUnit: 1,
          proteinGPerUnit: 1,
          carbsGPerUnit: 1,
          fatGPerUnit: 1,
        },
      ],
    });

    // Only the last line matches (right food, right unit): 100 of each.
    expect(macros).toEqual({
      calories: 100,
      proteinG: 100,
      carbsG: 100,
      fatG: 100,
    });
  });

  it("computes macros from the food dictionary as quantity times per-unit values", () => {
    const macros = computeLogMacros({
      kind: "food",
      quantity: 150,
      food: {
        id: "rice",
        unit: "g",
        caloriesPerUnit: 1.3,
        proteinGPerUnit: 0.027,
        carbsGPerUnit: 0.28,
        fatGPerUnit: 0.003,
      },
    });

    expect(macros.calories).toBeCloseTo(195);
    expect(macros.proteinG).toBeCloseTo(4.05);
    expect(macros.carbsG).toBeCloseTo(42);
    expect(macros.fatG).toBeCloseTo(0.45);
  });

  it("passes through freeform macros as entered, including when left blank", () => {
    const withEstimate = computeLogMacros({
      kind: "freeform",
      calories: 450,
      proteinG: 20,
      carbsG: 40,
      fatG: 15,
    });
    expect(withEstimate).toEqual({
      calories: 450,
      proteinG: 20,
      carbsG: 40,
      fatG: 15,
    });

    const withoutEstimate = computeLogMacros({
      kind: "freeform",
      calories: null,
      proteinG: null,
      carbsG: null,
      fatG: null,
    });
    expect(withoutEstimate).toEqual({
      calories: null,
      proteinG: null,
      carbsG: null,
      fatG: null,
    });
  });
});
