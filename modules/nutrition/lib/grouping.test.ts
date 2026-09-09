import { describe, expect, it } from "vitest";

import { groupByLocation } from "@/modules/nutrition/lib/grouping";

const item = (id: string, location: string) => ({ id, location });

describe("groupByLocation", () => {
  it("returns groups in registry order, not insertion order", () => {
    const groups = groupByLocation([
      item("a", "pantry"),
      item("b", "fridge"),
      item("c", "freezer"),
    ]);

    expect(groups.map((group) => group.location.key)).toEqual([
      "fridge",
      "freezer",
      "pantry",
    ]);
  });

  it("drops registry locations that hold nothing", () => {
    const groups = groupByLocation([item("a", "fridge")]);

    expect(groups).toHaveLength(1);
    expect(groups[0].location.label).toBe("Fridge");
    expect(groups[0].items.map((i) => i.id)).toEqual(["a"]);
  });

  it("keeps items whose location left the registry, after the known ones", () => {
    const groups = groupByLocation([item("a", "cellar"), item("b", "fridge")]);

    expect(groups.map((group) => group.location.key)).toEqual([
      "fridge",
      "cellar",
    ]);
  });

  it("preserves the caller's item order within a group", () => {
    const groups = groupByLocation([
      item("first", "fridge"),
      item("second", "fridge"),
      item("third", "fridge"),
    ]);

    expect(groups[0].items.map((i) => i.id)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });

  it("returns no groups for an empty pantry", () => {
    expect(groupByLocation([])).toEqual([]);
  });
});
