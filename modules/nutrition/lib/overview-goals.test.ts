import { describe, expect, it } from "vitest";

import {
  averageOf,
  macroGramGoalsFromCalories,
} from "@/modules/nutrition/lib/overview-goals";
import type { DailyTotal } from "@/modules/nutrition/lib/overview-totals";

describe("macroGramGoalsFromCalories", () => {
  it("splits a calorie goal into per-macro gram goals at 40/30/30", () => {
    expect(macroGramGoalsFromCalories(2200)).toEqual({
      proteinG: 220,
      carbsG: 165,
      fatG: 73,
    });
  });
});

describe("averageOf", () => {
  function day(overrides: Partial<DailyTotal>): DailyTotal {
    return {
      date: "2026-09-10",
      calories: 2000,
      proteinG: 150,
      carbsG: 200,
      fatG: 60,
      ...overrides,
    };
  }

  it("returns null when no day in the range was logged", () => {
    expect(averageOf([], "calories")).toBeNull();
    expect(
      averageOf(
        [day({ calories: null }), day({ calories: null })],
        "calories",
      ),
    ).toBeNull();
  });

  it("averages only the logged days, not counting a null day as zero", () => {
    const days = [
      day({ date: "2026-09-08", calories: 1800 }),
      day({ date: "2026-09-09", calories: null }),
      day({ date: "2026-09-10", calories: 2200 }),
    ];

    expect(averageOf(days, "calories")).toBe(2000);
  });
});
