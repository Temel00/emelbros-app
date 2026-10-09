import DOMPurify from "dompurify";

const EXTERNAL_URL_FN = /url\(\s*['"]?\s*(?!#)/i;

/** Drop external references; only same-document `#fragment` refs survive. */
function stripExternalRefs(node: Element) {
  for (const attr of Array.from(node.attributes)) {
    const name = attr.name.toLowerCase();
    const value = attr.value.trim();
    const isHref = name === "href" || name === "xlink:href";
    if ((isHref && !value.startsWith("#")) || EXTERNAL_URL_FN.test(value)) {
      node.removeAttribute(attr.name);
    }
  }
}

/**
 * Sanitise author SVG for inline rendering in the app origin (self-XSS guard).
 * DOMPurify svg profile (`USE_PROFILES` must not be combined with
 * `ALLOWED_TAGS`), minus foreignObject/script/style, with external refs removed.
 * Needs a DOM: call from the browser (or jsdom in tests).
 */
export function sanitiseSvg(text: string): string {
  DOMPurify.addHook("afterSanitizeAttributes", stripExternalRefs);
  try {
    return DOMPurify.sanitize(text, {
      USE_PROFILES: { svg: true, svgFilters: true },
      FORBID_TAGS: ["foreignObject", "script", "style"],
    });
  } finally {
    DOMPurify.removeHook("afterSanitizeAttributes", stripExternalRefs);
  }
}
