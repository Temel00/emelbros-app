import { resolveIcon } from "@/lib/icon";

// A plain (non-component) helper, so `resolveIcon`'s dynamic lookup doesn't
// read as "component created during render" the way calling it directly
// inside a row component would (react-hooks/static-components) — same
// pattern as habits' `kindIcon`. Fed the Lucide `icon` name stored on the
// managed location row (ADR-0017).
export function locationIcon(location: { icon: string }, className: string) {
  const Icon = resolveIcon(location.icon);
  return <Icon className={className} aria-hidden />;
}
