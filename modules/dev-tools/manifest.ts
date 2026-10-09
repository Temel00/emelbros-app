import type { ModuleManifest } from "@/platform/module-manifest";

/**
 * The Dev Tools module manifest (ADR-0001, ADR-0019). One module for every
 * client-side utility; Tools live in the module-internal registry and the
 * platform never learns about them. No tables, widgets, or profile sections.
 */
export const devToolsManifest = {
  slug: "dev-tools",
  name: "Dev Tools",
  description: "Small client-side utilities for working with code and assets.",
  icon: "Wrench",
  scopes: [],
  widgets: [],
  profileSections: [],
} satisfies ModuleManifest;
