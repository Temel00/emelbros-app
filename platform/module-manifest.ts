import type { ComponentType } from "react";

/**
 * A table's Scope Policy (ADR-0004), declared informationally — RLS is the
 * only enforcement (ADR-0007). `fixed` means every row carries one hardcoded
 * scope; `member-chosen` means the owner picks Private/Participants/Family
 * per record and may change it later.
 */
export type ScopeDeclaration = {
  /** The table this policy applies to, e.g. "habits_trackable". */
  table: string;
  policy: "fixed" | "member-chosen";
  /** Human-readable summary for the module catalog / code review. */
  description: string;
};

/**
 * A dashboard widget contribution (ADR-0005). `component` is a zero-prop
 * React Server Component about the current member; it fetches its own data
 * via the module's `queries.ts` and the platform current-member helper.
 */
export type ModuleWidget = {
  id: string;
  name: string;
  description: string;
  component: ComponentType;
};

/**
 * A profile-page contribution (ADR-0005). `component` takes exactly one
 * prop — the viewed member's id — and may render `null`, which is how
 * RLS-invisible data disappears from a profile.
 */
export type ProfileSection = {
  id: string;
  name: string;
  description: string;
  component: ComponentType<{ memberId: string }>;
};

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
  /** Informational Scope Policy catalog for this module's tables (ADR-0004). */
  scopes: ScopeDeclaration[];
  /** Dashboard widgets this module offers, pinnable independently (ADR-0002). */
  widgets: ModuleWidget[];
  /** Profile-page contributions this module offers. */
  profileSections: ProfileSection[];
};
