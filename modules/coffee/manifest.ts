import type { ModuleManifest } from "@/platform/module-manifest";

/**
 * The Coffee module manifest (ADR-0001). Beans and their grind profiles are
 * shared Family data; a grind profile rides its bean's scope. No widgets or
 * profile sections yet.
 */
export const coffeeManifest = {
  slug: "coffee",
  name: "Coffee",
  description:
    "Keep the family's beans and grind profiles, and send them to the grinder.",
  icon: "Coffee",
  scopes: [
    { table: "coffee_bean", policy: "fixed", scope: "family" },
    { table: "coffee_grind_profile", policy: "inherited", from: "coffee_bean" },
  ],
  widgets: [],
  profileSections: [],
} satisfies ModuleManifest;
