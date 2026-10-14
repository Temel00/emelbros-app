import { describe, expect, it } from "vitest";

import { parseSvg, type ViewBox } from "./parse-svg";
import {
  describeShape,
  insertionChange,
  randomColor,
  type ShapeDescriptor,
} from "./shapes";

const big: ViewBox = { minX: 0, minY: 0, width: 200, height: 100 };
const small: ViewBox = { minX: 0, minY: 0, width: 10, height: 10 };
const rng = () => 0;

const rect = (a: number[], b: number[]): ShapeDescriptor => ({
  tool: "rect",
  start: { x: a[0], y: a[1] },
  end: { x: b[0], y: b[1] },
});

function apply(text: string, element: string) {
  const parsed = parseSvg(text);
  if (!parsed.ok) throw new Error("fixture must be valid");
  const { from, to, insert } = insertionChange(text, parsed, element);
  return { out: text.slice(0, from) + insert + text.slice(to), from, to };
}

describe("randomColor", () => {
  it("is a 7-char hex and deterministic for a given rng", () => {
    expect(randomColor(() => 0.5)).toMatch(/^#[0-9a-f]{6}$/);
    expect(randomColor(() => 0.5)).toBe(randomColor(() => 0.5));
  });

  it("spreads across the wheel", () => {
    const colours = new Set(
      Array.from({ length: 12 }, (_, i) => randomColor(() => i / 12)),
    );
    expect(colours.size).toBe(12);
  });

  it("matches known HSL(0, 70%, 55%) red", () => {
    expect(randomColor(() => 0)).toBe("#dd3c3c");
  });
});

describe("describeShape", () => {
  it("writes a rect with rounded ints and a fill, no stroke", () => {
    const el = describeShape(rect([10.4, 20.6], [50, 40]), big, rng);
    expect(el).toBe(
      '<rect x="10" y="21" width="40" height="19" fill="#dd3c3c" />',
    );
    expect(el).not.toContain("stroke");
  });

  it("normalises a drag in any direction", () => {
    const el = describeShape(rect([50, 40], [10, 20]), big, rng);
    expect(el).toContain('x="10" y="20" width="40" height="20"');
  });

  it("uses 2 dp when the viewBox is narrower than 100", () => {
    const el = describeShape(rect([1.234, 2], [3.5, 4.567]), small, rng);
    expect(el).toContain('x="1.23" y="2" width="2.27" height="2.57"');
  });

  it("switches to ints at exactly width 100", () => {
    const vb = { ...small, width: 100 };
    expect(describeShape(rect([1.6, 0], [3, 1]), vb, rng)).toContain('x="2"');
  });

  it("writes an ellipse from the dragged bounding box", () => {
    const el = describeShape(
      { tool: "ellipse", start: { x: 10, y: 10 }, end: { x: 50, y: 30 } },
      big,
      rng,
    );
    expect(el).toBe(
      '<ellipse cx="30" cy="20" rx="20" ry="10" fill="#dd3c3c" />',
    );
  });

  it("writes a line with stroke and stroke-width 2, no fill", () => {
    const el = describeShape(
      { tool: "line", start: { x: 0, y: 0 }, end: { x: 90, y: 40 } },
      big,
      rng,
    );
    expect(el).toBe(
      '<line x1="0" y1="0" x2="90" y2="40" stroke="#dd3c3c" stroke-width="2" />',
    );
    expect(el).not.toContain("fill");
  });

  it("never emits -0", () => {
    const el = describeShape(rect([-0.001, 0], [1, 1]), small, rng);
    expect(el).not.toContain("-0");
  });
});

describe("insertionChange", () => {
  const el = '<rect x="1" />';

  it("inserts a new last line before </svg>, matching sibling indent", () => {
    const text = '<svg viewBox="0 0 100 100">\n    <circle r="1" />\n</svg>';
    const { out } = apply(text, el);
    expect(out).toBe(
      '<svg viewBox="0 0 100 100">\n    <circle r="1" />\n    <rect x="1" />\n</svg>',
    );
  });

  it("uses 2 spaces when the root has no children", () => {
    const { out } = apply('<svg viewBox="0 0 100 100">\n</svg>', el);
    expect(out).toBe('<svg viewBox="0 0 100 100">\n  <rect x="1" />\n</svg>');
  });

  it("ignores nested children when matching indent", () => {
    const text = "<svg>\n\t<g>\n\t\t<path d='M0 0' />\n\t</g>\n</svg>";
    expect(apply(text, el).out).toBe(
      "<svg>\n\t<g>\n\t\t<path d='M0 0' />\n\t</g>\n\t<rect x=\"1\" />\n</svg>",
    );
  });

  it("splits onto its own line when </svg> shares a line", () => {
    const { out } = apply("<svg><g/></svg>", el);
    expect(out).toBe('<svg><g/>\n<rect x="1" />\n</svg>');
  });

  it("expands a self-closing root", () => {
    const { out } = apply('<svg viewBox="0 0 10 10"/>', el);
    expect(out).toBe('<svg viewBox="0 0 10 10">\n  <rect x="1" />\n</svg>');
  });

  it("keeps a trailing newline after </svg> and comments intact", () => {
    const text = "<svg>\n  <!-- keep -->\n  <g/>\n</svg>\n";
    const { out } = apply(text, el);
    expect(out).toBe(
      '<svg>\n  <!-- keep -->\n  <g/>\n  <rect x="1" />\n</svg>\n',
    );
  });

  it("changes nothing outside the inserted line (byte-identical)", () => {
    const text =
      '<?xml version="1.0"?>\n<svg  viewBox = "0 0 100 100" >\n  <!-- hi -->\n  <g   id="a"/>\n</svg>\n';
    const { out, from, to } = apply(text, el);
    expect(out.slice(0, from)).toBe(text.slice(0, from));
    expect(out.slice(out.length - (text.length - to))).toBe(text.slice(to));
    expect(to - from).toBe(0);
  });

  it("produces text that still parses, with the shape as last child", () => {
    const { out } = apply('<svg viewBox="0 0 10 10">\n  <g/>\n</svg>', el);
    const reparsed = parseSvg(out);
    expect(reparsed.ok).toBe(true);
    expect(out.lastIndexOf("<rect")).toBeGreaterThan(out.lastIndexOf("<g/>"));
  });
});
