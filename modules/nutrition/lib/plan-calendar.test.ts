import { describe, expect, it } from "vitest";

import {
  addMonths,
  addWeeks,
  entriesAt,
  entriesOnDate,
  entryTitle,
  getMonthGrid,
  getWeekDays,
  monthRange,
  toIsoDate,
  weekRange,
} from "@/modules/nutrition/lib/plan-calendar";
import type { MealPlanEntryWithRecipe } from "@/modules/nutrition/queries";

function entry(
  overrides: Partial<MealPlanEntryWithRecipe>,
): MealPlanEntryWithRecipe {
  return {
    id: "entry-1",
    plan_date: "2026-01-05",
    meal_slot: "breakfast",
    recipe_id: null,
    freeform_title: "Omelet",
    servings_planned: 2,
    cooked_at: null,
    created_by: "member-1",
    created_at: "2026-01-01T00:00:00.000Z",
    recipe: null,
    ...overrides,
  } as MealPlanEntryWithRecipe;
}

describe("getWeekDays", () => {
  it("starts on Monday regardless of which day of the week `from` is", () => {
    // 2026-01-07 is a Wednesday.
    const days = getWeekDays(new Date("2026-01-07T12:00:00"));
    expect(days[0].date).toBe("2026-01-05"); // Monday
    expect(days[6].date).toBe("2026-01-11"); // Sunday
    expect(days).toHaveLength(7);
  });

  it("rolls a Sunday back to the Monday that started its week", () => {
    const days = getWeekDays(new Date("2026-01-11T12:00:00")); // Sunday
    expect(days[0].date).toBe("2026-01-05");
    expect(days[6].date).toBe("2026-01-11");
  });
});

describe("getMonthGrid", () => {
  it("produces a 6x7 grid covering the whole month with no ragged edges", () => {
    const grid = getMonthGrid(new Date("2026-02-15T12:00:00"));
    expect(grid).toHaveLength(6);
    grid.forEach((week) => expect(week).toHaveLength(7));
  });

  it("marks leading/trailing days from neighbouring months", () => {
    // February 2026 starts on a Sunday, so the grid needs 6 leading days.
    const grid = getMonthGrid(new Date("2026-02-15T12:00:00"));
    const flat = grid.flat();
    const first = flat[0];
    const febFirst = flat.find((d) => d.date === "2026-02-01");

    expect(first.inCurrentMonth).toBe(false);
    expect(febFirst?.inCurrentMonth).toBe(true);
  });

  it("is Monday-aligned", () => {
    const grid = getMonthGrid(new Date("2026-02-15T12:00:00"));
    const firstRowDates = grid[0].map((d) =>
      new Date(`${d.date}T00:00:00`).getDay(),
    );
    expect(firstRowDates[0]).toBe(1); // Monday
    expect(firstRowDates[6]).toBe(0); // Sunday
  });
});

describe("addWeeks / addMonths", () => {
  it("shifts by whole weeks", () => {
    const next = addWeeks(new Date("2026-01-05T00:00:00"), 1);
    expect(toIsoDate(next)).toBe("2026-01-12");
  });

  it("shifts to the first of the target month", () => {
    const next = addMonths(new Date("2026-01-15T00:00:00"), 1);
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(1);
  });
});

describe("weekRange / monthRange", () => {
  it("returns the Monday-to-Sunday span for a week", () => {
    expect(weekRange(new Date("2026-01-07T12:00:00"))).toEqual({
      start: "2026-01-05",
      end: "2026-01-11",
    });
  });

  it("returns the full 42-day grid span for a month, not just the calendar month", () => {
    const range = monthRange(new Date("2026-02-15T12:00:00"));
    expect(range.start < "2026-02-01").toBe(true);
    expect(range.end > "2026-02-28").toBe(true);
  });
});

describe("entriesOnDate / entriesAt", () => {
  const entries = [
    entry({ id: "a", plan_date: "2026-01-05", meal_slot: "breakfast" }),
    entry({ id: "b", plan_date: "2026-01-05", meal_slot: "dinner" }),
    entry({ id: "c", plan_date: "2026-01-06", meal_slot: "breakfast" }),
  ];

  it("filters entries to a single date", () => {
    expect(entriesOnDate(entries, "2026-01-05").map((e) => e.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("filters entries to a date and slot", () => {
    expect(entriesAt(entries, "2026-01-05", "dinner").map((e) => e.id)).toEqual(
      ["b"],
    );
  });

  it("returns nothing for a date with no entries", () => {
    expect(entriesOnDate(entries, "2026-01-09")).toEqual([]);
  });
});

describe("entryTitle", () => {
  it("prefers the recipe title when the entry is recipe-linked", () => {
    const linked = entry({
      recipe_id: "recipe-1",
      freeform_title: null,
      recipe: { id: "recipe-1", title: "Garlic pasta" } as never,
    });
    expect(entryTitle(linked)).toBe("Garlic pasta");
  });

  it("falls back to the freeform title otherwise", () => {
    const freeform = entry({
      recipe_id: null,
      freeform_title: "Leftovers",
      recipe: null,
    });
    expect(entryTitle(freeform)).toBe("Leftovers");
  });

  it("falls back to Untitled when neither is present", () => {
    const bare = entry({ recipe_id: null, freeform_title: null, recipe: null });
    expect(entryTitle(bare)).toBe("Untitled");
  });
});
