import { describe, expect, it } from "vitest";

import {
  computeStreak,
  isDueToday,
  parseISODate,
  toCadence,
  type DayLog,
} from "@/modules/habits/lib/cadence";

// A Wednesday, so tests can reason about ISO weekdays (1=Mon..7=Sun).
const TODAY = parseISODate("2026-07-15");

function logs(entries: Record<string, boolean>): DayLog[] {
  return Object.entries(entries).map(([date, done]) => ({ date, done }));
}

describe("isDueToday", () => {
  it("daily is always due unless already logged done today", () => {
    expect(isDueToday({ type: "daily" }, [], TODAY)).toBe(true);
    expect(
      isDueToday({ type: "daily" }, logs({ "2026-07-15": true }), TODAY),
    ).toBe(false);
  });

  it("weekdays is due only on a listed weekday", () => {
    // 2026-07-15 is a Wednesday (ISO 3).
    expect(isDueToday({ type: "weekdays", weekdays: [3] }, [], TODAY)).toBe(
      true,
    );
    expect(isDueToday({ type: "weekdays", weekdays: [1, 2] }, [], TODAY)).toBe(
      false,
    );
  });

  it("weekly is due until the week's target is met", () => {
    const cadence = { type: "weekly" as const, target: 2 };
    // Monday of this week is 2026-07-13.
    expect(isDueToday(cadence, [], TODAY)).toBe(true);
    expect(
      isDueToday(
        cadence,
        logs({ "2026-07-13": true, "2026-07-14": true }),
        TODAY,
      ),
    ).toBe(false);
  });
});

describe("computeStreak — daily", () => {
  const cadence = { type: "daily" as const };

  it("counts consecutive done days ending today", () => {
    const streak = computeStreak(
      cadence,
      logs({
        "2026-07-15": true,
        "2026-07-14": true,
        "2026-07-13": true,
      }),
      TODAY,
    );
    expect(streak).toBe(3);
  });

  it("doesn't break the streak just because today isn't logged yet", () => {
    const streak = computeStreak(
      cadence,
      logs({ "2026-07-14": true, "2026-07-13": true }),
      TODAY,
    );
    expect(streak).toBe(2);
  });

  it("breaks at a missed day in the past", () => {
    const streak = computeStreak(
      cadence,
      logs({
        "2026-07-15": true,
        "2026-07-14": false,
        "2026-07-13": true,
      }),
      TODAY,
    );
    expect(streak).toBe(1);
  });

  it("a backfilled day recomputes the streak with no stored state", () => {
    const before = computeStreak(
      cadence,
      logs({ "2026-07-15": true, "2026-07-13": true }),
      TODAY,
    );
    expect(before).toBe(1); // 2026-07-14 missing breaks it

    const after = computeStreak(
      cadence,
      logs({
        "2026-07-15": true,
        "2026-07-14": true, // backfilled
        "2026-07-13": true,
      }),
      TODAY,
    );
    expect(after).toBe(3);
  });
});

describe("computeStreak — weekdays", () => {
  // Mon/Wed/Fri (1, 3, 5).
  const cadence = { type: "weekdays" as const, weekdays: [1, 3, 5] };

  it("only counts scheduled days, skipping the rest", () => {
    const streak = computeStreak(
      cadence,
      logs({
        "2026-07-15": true, // Wed (scheduled)
        "2026-07-13": true, // Mon (scheduled)
        // Tue 07-14 not scheduled, and Sun 07-12 not scheduled — skipped.
        "2026-07-10": true, // Fri (scheduled)
      }),
      TODAY,
    );
    expect(streak).toBe(3);
  });

  it("breaks when a scheduled day in the past is missed", () => {
    const streak = computeStreak(
      cadence,
      logs({
        "2026-07-15": true, // Wed
        "2026-07-13": false, // Mon, missed
        "2026-07-10": true, // Fri
      }),
      TODAY,
    );
    expect(streak).toBe(1);
  });
});

describe("computeStreak — weekly", () => {
  const cadence = { type: "weekly" as const, target: 3 };

  it("counts consecutive weeks the target was met", () => {
    const streak = computeStreak(
      cadence,
      logs({
        // This week (Mon 07-13 .. Sun 07-19): 3 done so far.
        "2026-07-13": true,
        "2026-07-14": true,
        "2026-07-15": true,
        // Last week (07-06 .. 07-12): 3 done.
        "2026-07-06": true,
        "2026-07-08": true,
        "2026-07-10": true,
      }),
      TODAY,
    );
    expect(streak).toBe(2);
  });

  it("doesn't break for the current week still short of target", () => {
    const streak = computeStreak(
      cadence,
      logs({
        "2026-07-13": true, // this week: 1 of 3 so far — grace, week isn't over
        "2026-07-06": true,
        "2026-07-08": true,
        "2026-07-10": true, // last week: met
      }),
      TODAY,
    );
    expect(streak).toBe(1);
  });

  it("breaks at a past week that missed target", () => {
    const streak = computeStreak(
      cadence,
      logs({
        "2026-07-13": true,
        "2026-07-14": true,
        "2026-07-15": true, // this week: met
        "2026-07-06": true, // last week: only 1 of 3 — missed
      }),
      TODAY,
    );
    expect(streak).toBe(1);
  });
});

describe("toCadence", () => {
  it("maps trackable columns to a Cadence, or null when unscheduled", () => {
    expect(
      toCadence({
        cadence_type: "weekly",
        cadence_target: 4,
        cadence_weekdays: null,
      }),
    ).toEqual({ type: "weekly", target: 4 });

    expect(
      toCadence({
        cadence_type: null,
        cadence_target: null,
        cadence_weekdays: null,
      }),
    ).toBeNull();
  });
});
