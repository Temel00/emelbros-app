import { resolveIcon } from "@/lib/icon";

// A plain (non-component) helper, so `resolveIcon`'s dynamic lookup doesn't
// read as "component created during render" the way calling it directly inside
// a row component would (react-hooks/static-components) — same pattern as
// habits' `kindIcon` and `toItem`/`toCandidate` in the dashboard. Shared by the
// lists home and the My Lists widget, which render the same kind glyph.
export function kindIcon(
  iconName: string,
  className = "size-5 shrink-0 text-muted-foreground",
) {
  const Icon = resolveIcon(iconName);
  return <Icon className={className} aria-hidden />;
}
