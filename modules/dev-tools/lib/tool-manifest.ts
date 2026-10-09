/**
 * A Tool's plain-data manifest (ADR-0019): no component imports, so the
 * gallery reads only light metadata. Registry array order is gallery order.
 */
export type ToolManifest = {
  /** URL-safe identifier; the `[tool]` route segment. */
  slug: string;
  name: string;
  description: string;
  /** Lucide icon name, same convention as ModuleManifest. */
  icon: string;
};
