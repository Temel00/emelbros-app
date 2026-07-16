/**
 * Per-member accent (#18): each member owns one of the four brand brights as
 * their identity colour. It tints identity surfaces only — avatar, profile
 * band, widget top-rule, name pill — never buttons or links, so "who" and
 * "do it" (always pink) never blur. Five members, four colours: duplicates
 * are allowed, no special-cased fifth colour.
 */
export const MEMBER_ACCENTS = ["pink", "yellow", "green", "blue"] as const;

export type MemberAccent = (typeof MEMBER_ACCENTS)[number];

export function isMemberAccent(value: string): value is MemberAccent {
  return (MEMBER_ACCENTS as readonly string[]).includes(value);
}

// The four maps below repeat the same shape on purpose: Tailwind's build-time
// scanner only generates a utility for class names that appear as literal
// text somewhere in source, so a computed `${prefix}-c-${accent}` string
// would silently produce unstyled markup.

/** Tailwind class for filling an identity surface with a member's accent. */
export const ACCENT_BG: Record<MemberAccent, string> = {
  pink: "bg-c-pink",
  yellow: "bg-c-yellow",
  green: "bg-c-green",
  blue: "bg-c-blue",
};

/** Tailwind class for a member's accent as text colour (e.g. a name pill). */
export const ACCENT_TEXT: Record<MemberAccent, string> = {
  pink: "text-c-pink",
  yellow: "text-c-yellow",
  green: "text-c-green",
  blue: "text-c-blue",
};

/** Tailwind class for a member's accent as a top-rule (e.g. a widget card). */
export const ACCENT_BORDER_TOP: Record<MemberAccent, string> = {
  pink: "border-t-c-pink",
  yellow: "border-t-c-yellow",
  green: "border-t-c-green",
  blue: "border-t-c-blue",
};

/** Tailwind class for a member's accent as a ring (e.g. an avatar). */
export const ACCENT_RING: Record<MemberAccent, string> = {
  pink: "ring-c-pink",
  yellow: "ring-c-yellow",
  green: "ring-c-green",
  blue: "ring-c-blue",
};
