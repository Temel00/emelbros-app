import { describe, expect, it } from "vitest";

import { ingredientRollupText } from "./recipe-ingredient";

describe("ingredientRollupText", () => {
  it("joins quantity, unit and food name", () => {
    expect(ingredientRollupText(2, "tbsp", "Olive oil")).toBe(
      "2 tbsp Olive oil",
    );
  });

  it("omits a missing unit", () => {
    expect(ingredientRollupText(4, null, "Eggs")).toBe("4 Eggs");
  });

  it("omits a missing quantity, mid-edit before an amount is typed", () => {
    expect(ingredientRollupText(null, "g", "Flour")).toBe("g Flour");
  });

  it("reads as just the food name when neither quantity nor unit is set", () => {
    expect(ingredientRollupText(null, null, "Salt")).toBe("Salt");
  });

  it("treats an empty-string unit the same as a null one", () => {
    expect(ingredientRollupText(1, "", "Lemon")).toBe("1 Lemon");
  });
});
