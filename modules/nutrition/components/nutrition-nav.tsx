"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * A minimal two-way link between the nutrition module's views. Full
 * navigation for all six eventual views (pantry, recipes, plan, shopping,
 * log, overview) is deliberately not decided yet (wayfinder map #111,
 * "Not yet specified") — this is just enough for the views that exist
 * today to reach each other, not a sub-nav framework to build later views on.
 *
 * PROTOTYPE NOTE (#187, throwaway): this used to be a plain server component.
 * It's now client + `?card=`-aware ONLY so the `nav-tabs` folder treatment can
 * render these same items as folder tabs and this bar can step aside for it.
 * Revert to the server version when #187 resolves — the shared item list below
 * (NUTRITION_NAV_ITEMS) is the only part worth keeping.
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

function NavBar({ active }: { active: NutritionNavKey }) {
  return (
    <nav
      aria-label="Nutrition"
      className="flex w-fit flex-wrap gap-1 rounded-xl border border-border bg-card p-1 shadow-sm"
    >
      {NUTRITION_NAV_ITEMS.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={cn(
            "rounded-lg px-2.5 py-1 text-sm font-medium",
            active === item.key
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function NavGated({ active }: { active: NutritionNavKey }) {
  // The nav-scaled folder treatments render these items AS the folder tabs, so
  // this standalone bar only appears for the single-tab benchmark (`?card=tab`).
  // Every other value — including the default (no param) — is nav-based, so the
  // folder owns the nav and this bar steps aside to avoid a duplicate.
  const card = useSearchParams().get("card");
  if (card === "tab") return <NavBar active={active} />;
  return null;
}

export function NutritionNav({ active }: { active: NutritionNavKey }) {
  // Default fallback is null: the default folder treatment is nav-based and
  // renders its own tabs, so no standalone pill nav during SSR/suspense.
  return (
    <Suspense fallback={null}>
      <NavGated active={active} />
    </Suspense>
  );
}
