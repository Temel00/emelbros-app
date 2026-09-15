import { describe, expect, it } from "vitest";

import {
  logEntryDetail,
  logEntryDisplayText,
  logEntrySource,
  loggableCookedPlanEntries,
  scaleLogMacros,
} from "@/modules/nutrition/lib/log-display";
import type {
  FoodRow,
  LogEntryRow,
  MealPlanEntryWithRecipe,
  RecipeRow,
} from "@/modules/nutrition/queries";

function logEntry(overrides: Partial<LogEntryRow>): LogEntryRow {
  return {
    id: "log-1",
    member_id: "member-1",
    logged_at: "2026-01-05T12:00:00.000Z",
    food_id: null,
    recipe_id: null,
    description: null,
    quantity: null,
    unit: null,
    calories: 100,
    protein_g: 10,
    carbs_g: 10,
    fat_g: 10,
    note: null,
    created_at: "2026-01-05T12:00:00.000Z",
    updated_at: "2026-01-05T12:00:00.000Z",
    ...overrides,
  } as LogEntryRow;
}

function food(overrides: Partial<FoodRow>): FoodRow {
  return {
    id: "food-1",
    name: "Greek yogurt",
    brand: null,
    barcode: null,
    unit: "g",
    calories_per_unit: 1,
    protein_g_per_unit: 0.1,
    carbs_g_per_unit: 0.05,
    fat_g_per_unit: 0.03,
    fiber_g_per_unit: null,
    created_by: "member-1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as FoodRow;
}

function recipe(overrides: Partial<RecipeRow>): RecipeRow {
  return {
    id: "recipe-1",
    title: "Chicken Stir Fry",
    servings: 4,
    instructions: null,
    notes: null,
    created_by: "member-1",
    archived_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as RecipeRow;
}

function planEntry(
  overrides: Partial<MealPlanEntryWithRecipe>,
): MealPlanEntryWithRecipe {
  return {
    id: "entry-1",
    plan_date: "2026-01-05",
    meal_slot: "dinner",
    recipe_id: null,
    freeform_title: null,
    servings_planned: 2,
    cooked_at: null,
    created_by: "member-1",
    created_at: "2026-01-01T00:00:00.000Z",
    recipe: null,
    ...overrides,
  } as MealPlanEntryWithRecipe;
}

describe("logEntrySource", () => {
  it("is recipe when recipe_id is set", () => {
    expect(logEntrySource(logEntry({ recipe_id: "recipe-1" }))).toBe("recipe");
  });

  it("is food when food_id is set", () => {
    expect(logEntrySource(logEntry({ food_id: "food-1" }))).toBe("food");
  });

  it("is freeform otherwise", () => {
    expect(logEntrySource(logEntry({}))).toBe("freeform");
  });
});

describe("logEntryDisplayText", () => {
  it("shows the recipe's title when it's still in the active lookup", () => {
    const entry = logEntry({ recipe_id: "recipe-1" });
    expect(logEntryDisplayText(entry, [], [recipe({ id: "recipe-1" })])).toBe(
      "Chicken Stir Fry",
    );
  });

  it("falls back when the recipe has since been archived out of the lookup", () => {
    const entry = logEntry({ recipe_id: "recipe-gone" });
    expect(logEntryDisplayText(entry, [], [recipe({ id: "recipe-1" })])).toBe(
      "Recipe (no longer available)",
    );
  });

  it("shows the food's name and brand when found", () => {
    const entry = logEntry({ food_id: "food-1" });
    const found = food({ id: "food-1", name: "Yogurt", brand: "Fage" });
    expect(logEntryDisplayText(entry, [found], [])).toBe("Yogurt (Fage)");
  });

  it("omits the brand when the food has none", () => {
    const entry = logEntry({ food_id: "food-1" });
    const found = food({ id: "food-1", name: "Yogurt", brand: null });
    expect(logEntryDisplayText(entry, [found], [])).toBe("Yogurt");
  });

  it("falls back when the food isn't in the lookup", () => {
    const entry = logEntry({ food_id: "food-gone" });
    expect(logEntryDisplayText(entry, [food({ id: "food-1" })], [])).toBe(
      "Food (no longer available)",
    );
  });

  it("shows the freeform description", () => {
    const entry = logEntry({ description: "Handful of almonds" });
    expect(logEntryDisplayText(entry, [], [])).toBe("Handful of almonds");
  });

  it("falls back to a generic label when freeform has no description", () => {
    expect(logEntryDisplayText(logEntry({}), [], [])).toBe("Untitled entry");
  });
});

describe("logEntryDetail", () => {
  it("describes a single planned portion", () => {
    expect(
      logEntryDetail(logEntry({ recipe_id: "recipe-1", quantity: 1 })),
    ).toBe("1× planned portion");
  });

  it("describes a scaled portion", () => {
    expect(
      logEntryDetail(logEntry({ recipe_id: "recipe-1", quantity: 1.5 })),
    ).toBe("1.5× planned portion");
  });

  it("describes a food quantity and unit", () => {
    expect(
      logEntryDetail(logEntry({ food_id: "food-1", quantity: 2, unit: "cup" })),
    ).toBe("2 cup");
  });

  it("is null for freeform entries", () => {
    expect(logEntryDetail(logEntry({ description: "Snack" }))).toBeNull();
  });
});

describe("loggableCookedPlanEntries", () => {
  it("keeps only entries that are cooked and still have a recipe", () => {
    const cooked = planEntry({
      id: "cooked",
      cooked_at: "2026-01-05T10:00:00.000Z",
      recipe: recipe({ id: "recipe-1" }),
    });
    const notCooked = planEntry({ id: "not-cooked", cooked_at: null });
    const cookedButFreeform = planEntry({
      id: "cooked-freeform",
      cooked_at: "2026-01-05T10:00:00.000Z",
      recipe: null,
    });

    expect(
      loggableCookedPlanEntries([cooked, notCooked, cookedButFreeform]),
    ).toEqual([cooked]);
  });

  it("returns an empty list when nothing is cooked yet", () => {
    expect(loggableCookedPlanEntries([planEntry({ cooked_at: null })])).toEqual(
      [],
    );
  });
});

describe("scaleLogMacros", () => {
  it("scales all four macros proportionally to the new quantity", () => {
    const entry = logEntry({
      quantity: 2,
      calories: 200,
      protein_g: 20,
      carbs_g: 10,
      fat_g: 8,
    });
    expect(scaleLogMacros(entry, 3)).toEqual({
      calories: 300,
      proteinG: 30,
      carbsG: 15,
      fatG: 12,
    });
  });

  it("treats a null quantity as a base of one", () => {
    const entry = logEntry({
      quantity: null,
      calories: 100,
      protein_g: 10,
      carbs_g: 10,
      fat_g: 10,
    });
    expect(scaleLogMacros(entry, 2)).toEqual({
      calories: 200,
      proteinG: 20,
      carbsG: 20,
      fatG: 20,
    });
  });

  it("leaves macros unchanged when the base quantity is zero", () => {
    const entry = logEntry({
      quantity: 0,
      calories: 100,
      protein_g: 10,
      carbs_g: 10,
      fat_g: 10,
    });
    expect(scaleLogMacros(entry, 5)).toEqual({
      calories: 100,
      proteinG: 10,
      carbsG: 10,
      fatG: 10,
    });
  });
});
