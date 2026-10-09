import type { ToolManifest } from "@/modules/dev-tools/lib/tool-manifest";

export const svgSandboxManifest = {
  slug: "svg-sandbox",
  name: "SVG Sandbox",
  description: "Edit and preview SVG markup side by side.",
  icon: "Shapes",
} satisfies ToolManifest;
