import type { ParseSvgResult, ViewBox } from "./parse-svg";

type Point = { x: number; y: number };

/** A drag from `start` to `end`, both already in viewBox units. */
export type ShapeDescriptor = {
  tool: "rect" | "ellipse" | "line";
  start: Point;
  end: Point;
};

export type Rng = () => number;

export type TextChange = { from: number; to: number; insert: string };

const HUE_STEPS = 12;
const SATURATION = 0.7;
const LIGHTNESS = 0.55;

/** Hex colour at a hue spread around the wheel (12 steps, 5° jitter), fixed S/L. */
export function randomColor(rng: Rng): string {
  const hue =
    (Math.floor(rng() * HUE_STEPS) * (360 / HUE_STEPS) + rng() * 5) % 360;
  const c = (1 - Math.abs(2 * LIGHTNESS - 1)) * SATURATION;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = LIGHTNESS - c / 2;
  const [r, g, b] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x];
  const hex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function formatter(viewBox: ViewBox): (n: number) => string {
  // Integers for large viewBoxes, otherwise at most 2 decimals (no trailing zeros).
  const decimals = viewBox.width >= 100 ? 0 : 2;
  return (n) => String(Number(n.toFixed(decimals)) + 0);
}

/**
 * Geometry attributes for a descriptor, in drawing order. Shared by the
 * element writer and the on-canvas ghost so they cannot drift apart.
 */
export function shapeGeometry(
  { tool, start, end }: ShapeDescriptor,
  viewBox: ViewBox,
): [name: string, value: string][] {
  const f = formatter(viewBox);
  if (tool === "line") {
    return [
      ["x1", f(start.x)],
      ["y1", f(start.y)],
      ["x2", f(end.x)],
      ["y2", f(end.y)],
    ];
  }
  const minX = Math.min(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);
  if (tool === "rect") {
    return [
      ["x", f(minX)],
      ["y", f(minY)],
      ["width", f(w)],
      ["height", f(h)],
    ];
  }
  return [
    ["cx", f(minX + w / 2)],
    ["cy", f(minY + h / 2)],
    ["rx", f(w / 2)],
    ["ry", f(h / 2)],
  ];
}

const ELEMENT_NAME = {
  rect: "rect",
  ellipse: "ellipse",
  line: "line",
} as const;

/** One SVG element string for a drawn shape (ADR-0021). Pure given `rng`. */
export function describeShape(
  descriptor: ShapeDescriptor,
  viewBox: ViewBox,
  rng: Rng = Math.random,
): string {
  const style =
    descriptor.tool === "line"
      ? [
          ["stroke", randomColor(rng)],
          ["stroke-width", "2"],
        ]
      : [["fill", randomColor(rng)]];
  const attrs = [...shapeGeometry(descriptor, viewBox), ...style]
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");
  return `<${ELEMENT_NAME[descriptor.tool]} ${attrs} />`;
}

/**
 * The single text change that appends `element` as the last child of the
 * root, on its own line before the root close tag, indented like the previous
 * sibling (else 2 spaces). Everything outside the change is left untouched.
 */
export function insertionChange(
  text: string,
  parsed: Extract<ParseSvgResult, { ok: true }>,
  element: string,
): TextChange {
  const { rootCloseOffset: close, rootSelfClosing, lastChildOffset } = parsed;

  let indent = "  ";
  if (lastChildOffset !== null) {
    const siblingLine = text.lastIndexOf("\n", lastChildOffset - 1) + 1;
    indent = /^[ \t]*/.exec(text.slice(siblingLine, lastChildOffset))![0];
  }

  if (rootSelfClosing) {
    const name = /<([^\s/>?!]+)/.exec(text)![1];
    return {
      from: close,
      to: close + 2,
      insert: `>\n${indent}${element}\n</${name}>`,
    };
  }

  const lineStart = text.lastIndexOf("\n", close - 1) + 1;
  if (/^[ \t]*$/.test(text.slice(lineStart, close))) {
    return { from: lineStart, to: lineStart, insert: `${indent}${element}\n` };
  }
  return { from: close, to: close, insert: `\n${indent}${element}\n` };
}
