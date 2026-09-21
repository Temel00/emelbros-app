import { describe, expect, it } from "vitest";

import {
  groupByLocation,
  type GroupLocation,
} from "@/modules/nutrition/lib/grouping";

const item = (id: string, location: string) => ({ id, location });

// Stands in for `getPantryLocations()` — the managed list (ADR-0017),
// already ordered by `sort_order`.
const locations: GroupLocation[] = [
  { key: "fridge", label: "Fridge", icon: "Refrigerator" },
  { key: "freezer", label: "Freezer", icon: "Snowflake" },
  { key: "pantry", label: "Pantry", icon: "Archive" },
];

describe("groupByLocation", () => {
  it("returns groups in the managed order, not insertion order", () => {
    const groups = groupByLocation(
      [item("a", "pantry"), item("b", "fridge"), item("c", "freezer")],
      locations,
    );

    expect(groups.map((group) => group.location.key)).toEqual([
      "fridge",
      "freezer",
      "pantry",
    ]);
  });

  it("drops managed locations that hold nothing", () => {
    const groups = groupByLocation([item("a", "fridge")], locations);

    expect(groups).toHaveLength(1);
    expect(groups[0].location.label).toBe("Fridge");
    expect(groups[0].items.map((i) => i.id)).toEqual(["a"]);
  });

  it("keeps items whose location left the managed list, after the known ones", () => {
    const groups = groupByLocation(
      [item("a", "cellar"), item("b", "fridge")],
      locations,
    );

    expect(groups.map((group) => group.location.key)).toEqual([
      "fridge",
      "cellar",
    ]);
  });

  it("preserves the caller's item order within a group", () => {
    const groups = groupByLocation(
      [
        item("first", "fridge"),
        item("second", "fridge"),
        item("third", "fridge"),
      ],
      locations,
    );

    expect(groups[0].items.map((i) => i.id)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });

  it("returns no groups for an empty pantry", () => {
    expect(groupByLocation([], locations)).toEqual([]);
  });
});
