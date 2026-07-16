/**
 * The typed contract every module exports from its `manifest.ts`
 * (ADR-0001, ADR-0003). Modules import this from `platform/`; the platform
 * never imports a specific module in return — imports are one-way.
 *
 * This is a scaffold stub carrying only module identity. The full contract —
 * declared scopes, widgets, and profile sections (ADR-0005) — is formalized by
 * the module-contract ticket (#4). Do not treat this shape as complete.
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
};
