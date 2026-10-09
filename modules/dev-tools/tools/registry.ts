import type { ComponentType } from "react";

import type { ToolManifest } from "@/modules/dev-tools/lib/tool-manifest";
import { svgSandboxManifest } from "@/modules/dev-tools/tools/svg-sandbox/manifest";

export type ToolEntry = {
  manifest: ToolManifest;
  load: () => Promise<{ default: ComponentType }>;
};

/**
 * The module-internal Tool registry (ADR-0019). Adding a Tool is one folder
 * plus one entry here; the `load` thunk lives here, not in the manifest, so
 * each Tool is its own chunk. Array order is gallery order.
 */
export const tools: ToolEntry[] = [
  {
    manifest: svgSandboxManifest,
    load: () => import("./svg-sandbox"),
  },
];

export function getTool(slug: string): ToolEntry | undefined {
  return tools.find((tool) => tool.manifest.slug === slug);
}
