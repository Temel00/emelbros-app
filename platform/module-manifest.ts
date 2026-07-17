import type { ComponentType } from "react";

import type { Database } from "@/types/database";

type Scope = Database["public"]["Enums"]["scope"];

/**
 * A module table's Scope Policy, for the manifest's informational catalog
 * (ADR-0004): `fixed` names the one Scope every row carries; `member-chosen`
 * marks a table where the owning member picks per record; `inherited` marks
 * a table that carries no scope column of its own and rides another table's
 * visibility (e.g. darts_turn riding darts_game's Family scope). This is a
 * truthful label for the catalog page only — Postgres RLS is the only
 * enforcement (ADR-0004).
 */
export type ModuleTableScope =
  | { table: string; policy: "fixed"; scope: Scope }
  | { table: string; policy: "member-chosen" }
  | { table: string; policy: "inherited"; from: string };

/**
 * A zero-prop React Server Component about the current member (ADR-0005).
 * Fetches its own data via the module's `queries.ts` and the platform
 * current-member helper; the dashboard passes it nothing.
 */
export type ModuleWidget = {
  id: string;
  name: string;
  description: string;
  component: ComponentType;
};

/**
 * A one-prop React Server Component about the viewed member's profile
 * (ADR-0005). Returning `null` renders nothing, which is how RLS-invisible
 * data disappears from profiles.
 */
export type ModuleProfileSection = {
  id: string;
  name: string;
  component: ComponentType<{ memberId: string }>;
};

/**
 * The typed contract every module exports from its `manifest.ts`

/**
 * The typed contract every module exports from its `manifest.ts`
 * (ADR-0001, ADR-0003, ADR-0005). Modules import this from `platform/`; the
 * platform never imports a specific module in return — imports are one-way.
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
  /** Informational Scope Policy catalog for the module's tables (ADR-0004). */
  scopes: ModuleTableScope[];
  /** Dashboard widgets this module offers (ADR-0005). */
  widgets: ModuleWidget[];
  /** Member-profile contributions this module offers (ADR-0005). */
  profileSections: ModuleProfileSection[];
};locking it in.)