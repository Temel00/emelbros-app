/**
 * Stable per-Tool bright for the gallery (ADR-0020): derived from a hash of
 * the slug, never from array position, so inserting a Tool recolours no one.
 * Class names are spelled out in full so Tailwind can see them.
 */
const BRIGHTS = [
  { icon: "text-c-pink", stripe: "bg-c-pink" },
  { icon: "text-c-yellow", stripe: "bg-c-yellow" },
  { icon: "text-c-green", stripe: "bg-c-green" },
  { icon: "text-c-blue", stripe: "bg-c-blue" },
] as const;

export type ToolBright = (typeof BRIGHTS)[number];

/** FNV-1a over the slug's UTF-16 code units. */
function hashSlug(slug: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function brightForSlug(slug: string): ToolBright {
  return BRIGHTS[hashSlug(slug) % BRIGHTS.length];
}
