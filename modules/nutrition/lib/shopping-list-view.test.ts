import { describe, expect, it } from "vitest";

import {
  diffAutoLines,
  formatQuantity,
  groupShoppingListItems,
  isEmptyDiff,
  shoppingListToCsv,
} from "@/modules/nutrition/lib/shopping-list-view";
import type { ShoppingListShortfall } from "@/modules/nutrition/lib/shopping-list-generation";
import type {
  PantryItemWithFood,
  ShoppingListItemRow,
} from "@/modules/nutrition/queries";

function item(overrides: Partial<ShoppingListItemRow>): ShoppingListItemRow {
  return {
    id: "item-1",
    food_id: null,
    display_text: "Item",
    quantity: null,
    unit: null,
    source: "manual",
    checked_off: false,
    added_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as ShoppingListItemRow;
}

function pantryItem(
  overrides: Partial<PantryItemWithFood>,
): PantryItemWithFood {
  return {
    id: "pantry-1",
    food_id: "food-1",
    quantity: 1,
    unit: "each",
    location: "fridge",
    expires_on: null,
    added_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    food: { id: "food-1", name: "Milk" },
    ...overrides,
  } as PantryItemWithFood;
}

describe("formatQuantity", () => {
  it("joins quantity and unit", () => {
    expect(formatQuantity(2, "kg")).toBe("2 kg");
  });

  it("drops the unit when there is none", () => {
    expect(formatQuantity(1.5, null)).toBe("1.5");
  });

  it("shows just the unit when there is no quantity yet", () => {
    expect(formatQuantity(null, "kg")).toBe("kg");
  });

  it("shows an empty string when there is neither", () => {
    expect(formatQuantity(null, null)).toBe("");
  });
});

describe("groupShoppingListItems", () => {
  it("groups a line under the location of its food's first pantry row", () => {
    const milk = item({ id: "line-milk", food_id: "food-1" });
    const items = [milk];
    const pantryItems = [pantryItem({ food_id: "food-1", location: "fridge" })];

    const { grouped, notInPantry } = groupShoppingListItems(items, pantryItems);

    expect(notInPantry).toEqual([]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].location.key).toBe("fridge");
    expect(grouped[0].items).toEqual([milk]);
  });

  it("uses the first pantry row when a food has several", () => {
    const line = item({ id: "line-1", food_id: "food-1" });
    const pantryItems = [
      pantryItem({ id: "p1", food_id: "food-1", location: "freezer" }),
      pantryItem({ id: "p2", food_id: "food-1", location: "pantry" }),
    ];

    const { grouped } = groupShoppingListItems([line], pantryItems);

    expect(grouped).toHaveLength(1);
    expect(grouped[0].location.key).toBe("freezer");
  });

  it("falls back to notInPantry for a line with no linked food", () => {
    const line = item({ id: "line-manual", food_id: null });

    const { grouped, notInPantry } = groupShoppingListItems([line], []);

    expect(grouped).toEqual([]);
    expect(notInPantry).toEqual([line]);
  });

  it("falls back to notInPantry when the linked food has no pantry row", () => {
    const line = item({ id: "line-1", food_id: "food-unstocked" });

    const { grouped, notInPantry } = groupShoppingListItems([line], []);

    expect(grouped).toEqual([]);
    expect(notInPantry).toEqual([line]);
  });
});

describe("diffAutoLines", () => {
  const shortfall = (
    overrides: Partial<ShoppingListShortfall>,
  ): ShoppingListShortfall => ({
    foodId: "food-1",
    displayText: "2 kg Flour",
    quantity: 2,
    unit: "kg",
    ...overrides,
  });

  it("reports a pending line with no current match as added", () => {
    const diff = diffAutoLines([], [shortfall({})]);
    expect(diff.added).toHaveLength(1);
    expect(diff.changed).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  it("reports a matching food+unit with a different quantity as changed", () => {
    const current = item({
      id: "auto-1",
      source: "auto",
      food_id: "food-1",
      unit: "kg",
      quantity: 1,
    });
    const diff = diffAutoLines([current], [shortfall({ quantity: 3 })]);

    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0].previous).toBe(current);
    expect(diff.changed[0].next.quantity).toBe(3);
  });

  it("leaves an unchanged matching line out of the diff entirely", () => {
    const current = item({
      id: "auto-1",
      source: "auto",
      food_id: "food-1",
      unit: "kg",
      quantity: 2,
    });
    const diff = diffAutoLines([current], [shortfall({ quantity: 2 })]);

    expect(diff.added).toEqual([]);
    expect(diff.changed).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  it("reports a current auto line absent from the preview as removed", () => {
    const current = item({
      id: "auto-1",
      source: "auto",
      food_id: "food-1",
      unit: "kg",
      quantity: 2,
    });
    const diff = diffAutoLines([current], []);

    expect(diff.removed).toEqual([current]);
  });

  it("never touches manual lines even when a food+unit collides", () => {
    const manual = item({
      id: "manual-1",
      source: "manual",
      food_id: "food-1",
      unit: "kg",
      quantity: 2,
    });
    const diff = diffAutoLines([manual], [shortfall({ quantity: 3 })]);

    expect(diff.removed).toEqual([]);
    expect(diff.added).toHaveLength(1);
  });
});

describe("isEmptyDiff", () => {
  it("is true when nothing added, changed, or removed", () => {
    expect(isEmptyDiff({ added: [], changed: [], removed: [] })).toBe(true);
  });

  it("is false when anything is present", () => {
    expect(
      isEmptyDiff({
        added: [],
        changed: [],
        removed: [item({ id: "x" })],
      }),
    ).toBe(false);
  });
});

describe("shoppingListToCsv", () => {
  it("emits a header row plus one row per item", () => {
    const csv = shoppingListToCsv([
      item({ quantity: 2, unit: "kg", display_text: "Flour", checked_off: false }),
      item({ quantity: null, unit: null, display_text: "Napkins", checked_off: true }),
    ]);

    expect(csv).toBe(
      [
        "quantity,unit,item,checked",
        '2,kg,"Flour",no',
        ',,"Napkins",yes',
      ].join("\n"),
    );
  });

  it("escapes embedded quotes in the item text", () => {
    const csv = shoppingListToCsv([
      item({ display_text: 'The "good" cheese' }),
    ]);

    expect(csv).toContain('"The ""good"" cheese"');
  });
});
