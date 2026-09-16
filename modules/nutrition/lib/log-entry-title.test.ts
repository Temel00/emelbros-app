import { describe, expect, it } from "vitest";

import {
  logEntryTitle,
  nextIsoDate,
} from "@/modules/nutrition/lib/log-entry-title";
import type { LogEntryWithSource } from "@/modules/nutrition/queries";

function entry(overrides: Partial<LogEntryWithSource>): LogEntryWithSource {
  return {
    id: "log-1",
    member_id: "member-1",
    logged_at: "2026-09-10T12:00:00.000Z",
    food_id: null,
    recipe_id: null,
    description: null,
    quantity: null,
    unit: null,
    calories: null,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    note: null,
    created_at: "2026-09-10T12:00:00.000Z",
    updated_at: "2026-09-10T12:00:00.000Z",
    food: null,
    recipe: null,
    ...overrides,
  };
}

describe("nextIsoDate", () => {
  it("returns the following calendar day", () => {
    expect(nextIsoDate("2026-09-10")).toBe("2026-09-11");
  });

  it("rolls over a month boundary", () => {
    expect(nextIsoDate("2026-09-30")).toBe("2026-10-01");
  });

  it("rolls over a year boundary", () => {
    expect(nextIsoDate("2026-12-31")).toBe("2027-01-01");
  });
});

describe("logEntryTitle", () => {
  it("prefers the food name when the entry points at a food", () => {
    expect(
      logEntryTitle(
        entry({
          food: { name: "Greek yogurt" },
          recipe: { title: "Should not win" },
          description: "Should not win either",
        }),
      ),
    ).toBe("Greek yogurt");
  });

  it("falls back to the recipe title when there's no food", () => {
    expect(
      logEntryTitle(
        entry({ recipe: { title: "Chicken stir fry" }, description: "x" }),
      ),
    ).toBe("Chicken stir fry");
  });

  it("falls back to the freeform description when there's no food or recipe", () => {
    expect(logEntryTitle(entry({ description: "Leftover pizza" }))).toBe(
      "Leftover pizza",
    );
  });

  it("falls back to a placeholder when the entry has none of the three", () => {
    expect(logEntryTitle(entry({}))).toBe("Untitled entry");
  });
});
