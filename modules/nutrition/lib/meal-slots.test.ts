import { describe, expect, it } from "vitest";

import {
  DEFAULT_MEAL_SLOT,
  getMealSlot,
  mealSlots,
} from "@/modules/nutrition/lib/meal-slots";

describe("meal-slot registry", () => {
  it("offers the four v1 slots from the spec", () => {
    expect(mealSlots().map((slot) => slot.key)).toEqual([
      "breakfast",
      "lunch",
      "dinner",
      "snack",
    ]);
  });

  it("resolves a known key to its label and icon", () => {
    expect(getMealSlot("lunch")).toEqual({
      key: "lunch",
      label: "Lunch",
      icon: "Sandwich",
    });
  });

  it("falls back for an unknown key without losing it", () => {
    // Slots are additive and forgiving (§10): a row stored under a key
    // since removed from the registry still renders and still round-trips.
    expect(getMealSlot("brunch")).toEqual({
      key: "brunch",
      label: "Other",
      icon: "UtensilsCrossed",
    });
  });

  it("defaults new entries to a registered slot", () => {
    expect(mealSlots().map((slot) => slot.key)).toContain(DEFAULT_MEAL_SLOT);
  });
});
