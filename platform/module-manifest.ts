import type { ComponentType } from "react";

/**
 * The typed contract every module exports from its `manifest.ts`
 * (ADR-0001, ADR-0003). Modules import this from `platform/`; the platform
 * never imports a specific module in return — imports are one-way.
 */
export type ModuleManifest = {
  /** URL-safe identifier. Also the route segment and DB table prefix (ADR-0003, ADR-0006). */
  slug: string;
  /** Human-readable name shown on the launcher. */
  name: string;
  /** Short description for the module catalog. */
  description: string;
  /** Lucide icon name rendered by the launcher. */
  icon: string;
  /**
   * Informational, truthful catalog labels for each table's Scope Policy
   * (ADR-0004). Postgres RLS is the only enforcement — this is a
   * code-review convention, not runtime machinery.
   */
  scopes: ModuleScopeDeclaration[];
  /** Dashboard widgets this module offers (ADR-0005). */
  widgets: ModuleWidget[];
  /** Member-profile contributions this module offers (ADR-0005). */
  profileSections: ModuleProfileSection[];
};

export type ModuleScopeDeclaration = {
  /** The table this declaration describes. */
  table: string;
  /** Plain-language Scope Policy, e.g. "member-chosen" or "fixed: family". */
  policy: string;
};

/**
 * A zero-prop React Server Component (ADR-0005): always about the current
 * member, fetching its own data via the module's `queries.ts` and the
 * platform's current-member helper.
 */
export type ModuleWidget = {
  id: string;
  name: string;
  description: string;
  component: ComponentType;
};

/**
 * A React Server Component taking exactly the viewed member's id (ADR-0005).
 * Returning `null` renders nothing — how RLS-invisible data disappears from
 * profiles.
 */
export type ModuleProfileSection = {
  id: string;
  name: string;
  description: string;
  component: ComponentType<{ memberId: string }>;
};
