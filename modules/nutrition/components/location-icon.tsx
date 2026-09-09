import { resolveIcon } from "@/lib/icon";
import type { PantryLocation } from "@/modules/nutrition/lib/locations";

// A plain (non-component) helper, so `resolveIcon`'s dynamic lookup doesn't
// read as "component created during render" the way calling it directly
// inside a row component would (react-hooks/static-components) — same
// pattern as habits' `kindIcon`.
export function locationIcon(location: PantryLocation, className: string) {
  const Icon = resolveIcon(location.icon);
  return <Icon className={className} aria-hidden />;
}
