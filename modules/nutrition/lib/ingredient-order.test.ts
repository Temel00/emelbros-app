import { describe, expect, it } from "vitest";

import {
  moveIngredient,
  nextIngredientPosition,
} from "@/modules/nutrition/lib/ingredient-order";

describe("nextIngredientPosition", () => {
  it("starts a fresh recipe's first line at zero", () => {
    expect(nextIngredientPosition([])).toBe(0);
  });

  it("appends after the lines already on the recipe", () => {
    expect(nextIngredientPosition(["flour", "sugar", "butter"])).toBe(3);
  });
});

describe("moveIngredient", () => {
  it("swaps a line with the one above it", () => {
    expect(moveIngredient(["a", "b", "c"], "c", "up")).toEqual(["a", "c", "b"]);
  });

  it("swaps a line with the one below it", () => {
    expect(moveIngredient(["a", "b", "c"], "a", "down")).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("leaves the first line alone when moved up", () => {
    expect(moveIngredient(["a", "b"], "a", "up")).toEqual(["a", "b"]);
  });

  it("leaves the last line alone when moved down", () => {
    expect(moveIngredient(["a", "b"], "b", "down")).toEqual(["a", "b"]);
  });

  it("leaves the order alone when the id is not on the recipe", () => {
    expect(moveIngredient(["a", "b"], "zzz", "up")).toEqual(["a", "b"]);
  });

  it("does not mutate the order it was given", () => {
    const order = ["a", "b"];
    moveIngredient(order, "b", "up");
    expect(order).toEqual(["a", "b"]);
  });
});
