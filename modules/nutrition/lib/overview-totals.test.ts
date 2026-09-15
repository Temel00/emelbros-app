import { describe, expect, it } from "vitest";

import {
  computeOverviewTotals,
  type LogEntryForTotals,
} from "@/modules/nutrition/lib/overview-totals";

function entry(overrides: Partial<LogEntryForTotals>): LogEntryForTotals {
  return {
    logged_at: "2026-09-10T12:00:00Z",
    calories: 100,
    protein_g: 10,
    carbs_g: 10,
    fat_g: 5,
    ...overrides,
  };
}

describe("computeOverviewTotals", () => {
  it("returns no buckets for an empty range", () => {
    expect(computeOverviewTotals([])).toEqual({ daily: [], weekly: [] });
  });

  it("sums several entries logged on the same day into one daily bucket", () => {
    const result = computeOverviewTotals([
      entry({
        logged_at: "2026-09-10T08:00:00Z",
        calories: 300,
        protein_g: 20,
        carbs_g: 30,
        fat_g: 10,
      }),
      entry({
        logged_at: "2026-09-10T18:30:00Z",
        calories: 500,
        protein_g: 25,
        carbs_g: 40,
        fat_g: 15,
      }),
    ]);

    expect(result.daily).toEqual([
      {
        date: "2026-09-10",
        calories: 800,
        proteinG: 45,
        carbsG: 70,
        fatG: 25,
      },
    ]);
    expect(result.weekly).toEqual([
      {
        weekStart: "2026-09-07", // Monday of that week
        calories: 800,
        proteinG: 45,
        carbsG: 70,
        fatG: 25,
      },
    ]);
  });

  it("splits entries into separate weekly buckets when the range spans a month boundary", () => {
    // 2026-08-31 is a Monday (week of Aug 31 - Sep 6); 2026-09-01 is a
    // Tuesday in that same week, so both entries land in one weekly bucket
    // even though their days cross the month boundary.
    const result = computeOverviewTotals([
      entry({ logged_at: "2026-08-31T09:00:00Z", calories: 400 }),
      entry({ logged_at: "2026-09-01T09:00:00Z", calories: 600 }),
      // A week later, safely inside September, its own bucket.
      entry({ logged_at: "2026-09-08T09:00:00Z", calories: 700 }),
    ]);

    expect(result.daily.map((d) => d.date)).toEqual([
      "2026-08-31",
      "2026-09-01",
      "2026-09-08",
    ]);
    expect(result.weekly).toEqual([
      expect.objectContaining({ weekStart: "2026-08-31", calories: 1000 }),
      expect.objectContaining({ weekStart: "2026-09-07", calories: 700 }),
    ]);
  });

  it("leaves a macro null in the bucket when every entry that day omitted it, rather than showing a false zero", () => {
    const result = computeOverviewTotals([
      entry({
        logged_at: "2026-09-10T08:00:00Z",
        calories: 300,
        protein_g: null,
        carbs_g: 30,
        fat_g: null,
      }),
      entry({
        logged_at: "2026-09-10T18:00:00Z",
        calories: null,
        protein_g: null,
        carbs_g: 20,
        fat_g: null,
      }),
    ]);

    expect(result.daily).toEqual([
      {
        date: "2026-09-10",
        calories: 300,
        proteinG: null,
        carbsG: 50,
        fatG: null,
      },
    ]);
  });

  it("counts a macro present on at least one entry that day, even if other entries that day omitted it", () => {
    const result = computeOverviewTotals([
      entry({ logged_at: "2026-09-10T08:00:00Z", protein_g: 20 }),
      entry({ logged_at: "2026-09-10T18:00:00Z", protein_g: null }),
    ]);

    expect(result.daily[0].proteinG).toBe(20);
  });
});
