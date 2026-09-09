import { describe, expect, it } from "vitest";

import { modules } from "@/modules";

describe("module registry", () => {
  it("is an array", () => {
    expect(Array.isArray(modules)).toBe(true);
  });

  it("registers the lists module", () => {
    expect(modules.map((mod) => mod.slug)).toContain("lists");
  });

  it("registers the darts module", () => {
    const darts = modules.find((mod) => mod.slug === "darts");
    expect(darts).toBeDefined();
    expect(darts?.scopes).toContainEqual({
      table: "darts_game",
      policy: "fixed",
      scope: "family",
    });
    expect(darts?.widgets).toHaveLength(1);
    expect(darts?.profileSections).toEqual([]);
  });

  it("registers the nutrition module", () => {
    const nutrition = modules.find((mod) => mod.slug === "nutrition");
    expect(nutrition).toBeDefined();
    // Both Phase 1a tables are fixed Family — the kitchen is shared
    // (docs/modules/nutrition.md §2).
    expect(nutrition?.scopes).toEqual([
      { table: "nutrition_food", policy: "fixed", scope: "family" },
      { table: "nutrition_pantry_item", policy: "fixed", scope: "family" },
    ]);
    // The Nutrition widget is about today's log, so it ships with Phase 3.
    expect(nutrition?.widgets).toEqual([]);
    expect(nutrition?.profileSections).toEqual([]);
  });
});
