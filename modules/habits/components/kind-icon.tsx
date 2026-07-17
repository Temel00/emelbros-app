import { resolveIcon } from "@/lib/icon";
import type { TrackableKind } from "@/modules/habits/lib/kinds";

// A plain (non-component) helper, so `resolveIcon`'s dynamic lookup doesn't
// read as "component created during render" the way calling it directly
// inside a row component would (react-hooks/static-components) — same
// pattern as `toItem`/`toCandidate` in components/dashboard/dashboard.tsx.
export function kindIcon(kind: TrackableKind, className: string) {
  const Icon = resolveIcon(kind.icon);
  return <Icon className={className} aria-hidden />;
}
