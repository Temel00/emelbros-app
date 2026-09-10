import { describe, expect, it } from "vitest";

import { computeCookDecrements } from "@/modules/nutrition/lib/pantry-decrement";

const FLOUR = "food-flour";
const EGGS = "food-eggs";
const SALT = "food-salt";

describe("computeCookDecrements", () => {
  it("decrements a linked line with enough pantry stock", () => {
    const decrements = computeCookDecrements(
      2,
      2,
      [{ foodId: FLOUR, quantity: 200, unit: "g" }],
      [{ id: "pantry-flour", foodId: FLOUR, quantity: 500, unit: "g" }],
    );

    expect(decrements).toEqual([
      { pantryItemId: "pantry-flour", quantity: 300 },
    ]);
  });

  it("still decrements a linked line that has too little on hand, going negative", () => {
    const decrements = computeCookDecrements(
      1,
      1,
      [{ foodId: EGGS, quantity: 6, unit: "each" }],
      [{ id: "pantry-eggs", foodId: EGGS, quantity: 2, unit: "each" }],
    );

    expect(decrements).toEqual([{ pantryItemId: "pantry-eggs", quantity: -4 }]);
  });

  it("skips an unlinked line", () => {
    const decrements = computeCookDecrements(
      1,
      1,
      [{ foodId: null, quantity: null, unit: null }],
      [{ id: "pantry-salt", foodId: SALT, quantity: 100, unit: "g" }],
    );

    expect(decrements).toEqual([]);
  });

  it("skips a linked line with no matching pantry row", () => {
    const decrements = computeCookDecrements(
      1,
      1,
      [{ foodId: FLOUR, quantity: 200, unit: "g" }],
      [],
    );

    expect(decrements).toEqual([]);
  });

  it("skips a linked line whose pantry row is in a different unit (no conversion)", () => {
    const decrements = computeCookDecrements(
      1,
      1,
      [{ foodId: FLOUR, quantity: 200, unit: "g" }],
      [{ id: "pantry-flour", foodId: FLOUR, quantity: 500, unit: "kg" }],
    );

    expect(decrements).toEqual([]);
  });

  it("scales by servings planned over the recipe's own servings", () => {
    const decrements = computeCookDecrements(
      4,
      6,
      [{ foodId: FLOUR, quantity: 400, unit: "g" }],
      [{ id: "pantry-flour", foodId: FLOUR, quantity: 1000, unit: "g" }],
    );

    // 400g is written for 4 servings; 6 servings planned is 1.5x.
    expect(decrements).toEqual([
      { pantryItemId: "pantry-flour", quantity: 400 },
    ]);
  });

  it("computes one decrement per matching line across several ingredients", () => {
    const decrements = computeCookDecrements(
      2,
      2,
      [
        { foodId: FLOUR, quantity: 200, unit: "g" },
        { foodId: EGGS, quantity: 2, unit: "each" },
        { foodId: null, quantity: null, unit: null },
      ],
      [
        { id: "pantry-flour", foodId: FLOUR, quantity: 500, unit: "g" },
        { id: "pantry-eggs", foodId: EGGS, quantity: 12, unit: "each" },
      ],
    );

    expect(decrements).toEqual([
      { pantryItemId: "pantry-flour", quantity: 300 },
      { pantryItemId: "pantry-eggs", quantity: 10 },
    ]);
  });
});
