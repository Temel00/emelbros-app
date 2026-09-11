import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * A minimal two-way link between the nutrition module's views. Full
 * navigation for all six eventual views (pantry, recipes, plan, shopping,
 * log, overview) is deliberately not decided yet (wayfinder map #111,
 * "Not yet specified") — this is just enough for the two views that exist
 * today to reach each other, not a sub-nav framework to build later views on.
 */
export function NutritionNav({
  active,
}: {
  active: "pantry" | "recipes" | "plan";
}) {
  const linkClass = (key: "pantry" | "recipes" | "plan") =>
    cn(
      "rounded-lg px-2.5 py-1 text-sm font-medium",
      active === key
        ? "bg-secondary text-secondary-foreground"
        : "text-muted-foreground hover:text-foreground",
    );

  return (
    <nav aria-label="Nutrition" className="flex gap-1">
      <Link href="/nutrition" className={linkClass("pantry")}>
        Pantry
      </Link>
      <Link href="/nutrition/recipes" className={linkClass("recipes")}>
        Recipes
      </Link>
      <Link href="/nutrition/plan" className={linkClass("plan")}>
        Plan
      </Link>
    </nav>
  );
}
