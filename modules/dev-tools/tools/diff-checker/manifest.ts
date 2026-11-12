import type { ToolManifest } from "@/modules/dev-tools/lib/tool-manifest";

export const diffCheckerManifest = {
  slug: "diff-checker",
  name: "Diff Checker",
  description: "Compare two texts and see the differences as you edit.",
  icon: "Diff",
} satisfies ToolManifest;
