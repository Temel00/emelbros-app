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
    // Every Phase 1 and Phase 2a table is Family — the kitchen is shared
    // (docs/modules/nutrition.md §2) — with the ingredient line carrying
    // no scope of its own and riding its parent recipe.
    expect(nutrition?.scopes).toEqual([
      { table: "nutrition_food", policy: "fixed", scope: "family" },
      { table: "nutrition_pantry_item", policy: "fixed", scope: "family" },
      { table: "nutrition_recipe", policy: "fixed", scope: "family" },
      {
        table: "nutrition_recipe_ingredient",
        policy: "inherited",
        from: "nutrition_recipe",
      },
      { table: "nutrition_meal_plan_entry", policy: "fixed", scope: "family" },
    ]);
    // The Nutrition widget is about today's log, so it ships with Phase 3.
    expect(nutrition?.widgets).toEqual([]);
    expect(nutrition?.profileSections).toEqual([]);
  });
});
