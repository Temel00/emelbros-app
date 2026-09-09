import type { ModuleManifest } from "@/platform/module-manifest";

/**
 * The nutrition module manifest (ADR-0001, docs/modules/nutrition.md §5).
 *
 * The Phase 1 tables are declared here; the meal-plan, shopping-list and
 * log tables join this catalog as their own tickets land (§7). All four
 * are Family — the kitchen is one shared thing (§2, §10) — with
 * `nutrition_recipe_ingredient` carrying no scope of its own and riding
 * its parent recipe, the way `darts_turn` rides `darts_game`. The lone
 * Private table, `nutrition_log`, arrives with Phase 3.
 */
export const nutritionManifest = {
  slug: "nutrition",
  name: "Nutrition",
  description:
    "Track the family pantry, recipes, meal plans, and what everyone eats.",
  icon: "UtensilsCrossed",
  scopes: [
    { table: "nutrition_food", policy: "fixed", scope: "family" },
    { table: "nutrition_pantry_item", policy: "fixed", scope: "family" },
    { table: "nutrition_recipe", policy: "fixed", scope: "family" },
    {
      table: "nutrition_recipe_ingredient",
      policy: "inherited",
      from: "nutrition_recipe",
    },
  ],
  // No widget in v1's first phase — the Nutrition widget is about today's
  // logged calories (§6), so it ships with the log in Phase 3.
  widgets: [],
  // None planned: a member's nutrition history is Private (§2), so there's
  // nothing to surface on a shared profile page (§5).
  profileSections: [],
} satisfies ModuleManifest;
