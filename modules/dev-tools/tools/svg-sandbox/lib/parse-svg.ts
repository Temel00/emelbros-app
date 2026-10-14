import { SaxesParser } from "saxes";

const SVG_NS = "http://www.w3.org/2000/svg";

export type ViewBox = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

export type ParseSvgResult =
  | {
      ok: true;
      /** Offset of the `<` of the root's closing tag; for a self-closing root, the `/>`. */
      rootCloseOffset: number;
      /** True when the root is `<svg ... />` and has no separate closing tag. */
      rootSelfClosing: boolean;
      viewBox: ViewBox | null;
    }
  | { ok: false; line: number; col: number; message: string };

function parseViewBox(raw: string | undefined): ViewBox | null {
  if (raw === undefined) return null;
  const parts = raw
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [minX, minY, width, height] = parts;
  if (width <= 0 || height <= 0) return null;
  return { minX, minY, width, height };
}

/**
 * Strict well-formedness check (saxes) requiring exactly one root `<svg>`.
 * Pure and UI-free. No element-to-source map in v1 (ADR-0021).
 */
export function parseSvg(text: string): ParseSvgResult {
  const parser = new SaxesParser({ xmlns: true });

  type Failure = { line: number; col: number; message: string };
  let failure = null as Failure | null;
  let depth = 0;
  let rootSeen = false;
  let rootClosed = false;
  let rootCloseOffset = -1;
  let rootSelfClosing = false;
  let viewBox: ViewBox | null = null;

  const fail = (message: string) => {
    if (failure) return;
    failure = {
      line: parser.line,
      col: parser.column,
      // saxes prefixes messages with "line:col: "; position is reported separately.
      message: message.replace(/^\d+:\d+:\s*/, ""),
    };
  };

  parser.on("error", (err) => fail(err.message));

  parser.on("opentag", (tag) => {
    if (depth === 0) {
      rootSeen = true;
      if (tag.local !== "svg" || (tag.uri !== "" && tag.uri !== SVG_NS)) {
        fail(`Root element must be <svg>, found <${tag.name}>`);
        return;
      }
      viewBox = parseViewBox(tag.attributes["viewBox"]?.value);
      if (tag.isSelfClosing) {
        rootClosed = true;
        rootSelfClosing = true;
        // position is just past `>`; the tag ends in `/>`.
        rootCloseOffset = parser.position - 2;
      }
    }
    if (!tag.isSelfClosing) depth++;
  });

  parser.on("closetag", (tag) => {
    if (tag.isSelfClosing) return;
    depth--;
    if (depth === 0 && !rootClosed) {
      rootClosed = true;
      // position is just past `>`; no `<` can occur inside a closing tag.
      rootCloseOffset = text.lastIndexOf("<", parser.position - 1);
    }
  });

  try {
    parser.write(text).close();
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }

  if (failure) return { ok: false, ...failure };
  if (!rootSeen || !rootClosed) {
    return {
      ok: false,
      line: parser.line,
      col: parser.column,
      message: "Document must contain exactly one root <svg> element",
    };
  }
  return { ok: true, rootCloseOffset, rootSelfClosing, viewBox };
}
