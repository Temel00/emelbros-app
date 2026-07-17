import { icons, LayoutGrid, type LucideIcon } from "lucide-react";

/**
 * Resolves a Module Manifest's `icon` (a Lucide icon name, ADR-0001) to its
 * component. Falls back to a generic icon rather than throwing, since an
 * unrecognised name is a content typo, not a reason to break the launcher.
 */
export function resolveIcon(name: string): LucideIcon {
  return (icons as Record<string, LucideIcon>)[name] ?? LayoutGrid;
}
