import { describe, expect, it } from "vitest";

import { computeShoppingListShortfalls } from "@/modules/nutrition/lib/shopping-list-generation";

const FLOUR = "food-flour";
const EGGS = "food-eggs";
const SALT = "food-salt";

describe("computeShoppingListShortfalls", () => {
  it("emits no line when the pantry fully covers a planned ingredient", () => {
    const shortfalls = computeShoppingListShortfalls(
      [
        {
          recipeServings: 2,
          servingsPlanned: 2,
          lines: [
            { foodId: FLOUR, foodName: "Flour", quantity: 200, unit: "g" },
          ],
        },
      ],
      [{ foodId: FLOUR, quantity: 500, unit: "g" }],
    );

    expect(shortfalls).toEqual([]);
  });

  it("emits the shortfall only when the pantry partially covers it", () => {
    const shortfalls = computeShoppingListShortfalls(
      [
        {
          recipeServings: 2,
          servingsPlanned: 2,
          lines: [
            { foodId: FLOUR, foodName: "Flour", quantity: 500, unit: "g" },
          ],
        },
      ],
      [{ foodId: FLOUR, quantity: 200, unit: "g" }],
    );

    expect(shortfalls).toEqual([
      { foodId: FLOUR, displayText: "300 g Flour", quantity: 300, unit: "g" },
    ]);
  });

  it("emits no line when there is no pantry row at all for the food", () => {
    const shortfalls = computeShoppingListShortfalls(
      [
        {
          recipeServings: 1,
          servingsPlanned: 1,
          lines: [
            { foodId: FLOUR, foodName: "Flour", quantity: 200, unit: "g" },
          ],
        },
      ],
      [],
    );

    expect(shortfalls).toEqual([]);
  });

  it("skips an unlinked ingredient line", () => {
    const shortfalls = computeShoppingListShortfalls(
      [
        {
          recipeServings: 1,
          servingsPlanned: 1,
          lines: [
            {
              foodId: null,
              foodName: "A pinch of salt",
              quantity: null,
              unit: null,
            },
          ],
        },
      ],
      [{ foodId: SALT, quantity: 100, unit: "g" }],
    );

    expect(shortfalls).toEqual([]);
  });

  it("skips a linked line whose only pantry row is in a different unit (no conversion)", () => {
    const shortfalls = computeShoppingListShortfalls(
      [
        {
          recipeServings: 1,
          servingsPlanned: 1,
          lines: [
            { foodId: FLOUR, foodName: "Flour", quantity: 200, unit: "g" },
          ],
        },
      ],
      [{ foodId: FLOUR, quantity: 500, unit: "kg" }],
    );

    expect(shortfalls).toEqual([]);
  });

  it("sums the same food across two planned recipes into one line", () => {
    const shortfalls = computeShoppingListShortfalls(
      [
        {
          recipeServings: 2,
          servingsPlanned: 2,
          lines: [
            { foodId: EGGS, foodName: "Eggs", quantity: 2, unit: "each" },
          ],
        },
        {
          recipeServings: 1,
          servingsPlanned: 1,
          lines: [
            { foodId: EGGS, foodName: "Eggs", quantity: 4, unit: "each" },
          ],
        },
      ],
      [{ foodId: EGGS, quantity: 3, unit: "each" }],
    );

    // 2 + 4 = 6 needed, 3 on hand, 3 short.
    expect(shortfalls).toEqual([
      { foodId: EGGS, displayText: "3 each Eggs", quantity: 3, unit: "each" },
    ]);
  });

  it("scales by servings planned over the recipe's own servings", () => {
    const shortfalls = computeShoppingListShortfalls(
      [
        {
          recipeServings: 4,
          servingsPlanned: 6,
          lines: [
            { foodId: FLOUR, foodName: "Flour", quantity: 400, unit: "g" },
          ],
        },
      ],
      [{ foodId: FLOUR, quantity: 100, unit: "g" }],
    );

    // 400g written for 4 servings; 6 planned is 1.5x = 600g needed, 100 on
    // hand, 500 short.
    expect(shortfalls).toEqual([
      { foodId: FLOUR, displayText: "500 g Flour", quantity: 500, unit: "g" },
    ]);
  });
});
