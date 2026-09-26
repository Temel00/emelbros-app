/**
 * The nutrition module's navigation model: the ordered list of its screens.
 *
 * There is no standalone nav bar any more. The settled content treatment
 * (#187, ADR-0018) folds the nav INTO the folder card's tabs — the folder
 * owns the nav — so the old pill bar would only duplicate it. What survives is
 * this shared, ordered item list, consumed by `folder-card.tsx` to render the
 * tabs in natural order with the active tab scaled up as the page title.
 */

export type NutritionNavKey =
  "pantry" | "recipes" | "plan" | "shopping" | "log" | "overview" | "settings";

export const NUTRITION_NAV_ITEMS: {
  key: NutritionNavKey;
  label: string;
  href: string;
}[] = [
  { key: "pantry", label: "Pantry", href: "/nutrition" },
  { key: "recipes", label: "Recipes", href: "/nutrition/recipes" },
  { key: "plan", label: "Plan", href: "/nutrition/plan" },
  { key: "shopping", label: "Shopping", href: "/nutrition/shopping-list" },
  { key: "log", label: "Log", href: "/nutrition/log" },
  { key: "overview", label: "Overview", href: "/nutrition/overview" },
  { key: "settings", label: "Settings", href: "/nutrition/settings" },
];
