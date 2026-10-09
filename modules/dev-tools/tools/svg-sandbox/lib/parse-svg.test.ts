import { describe, expect, it } from "vitest";

import { parseSvg } from "./parse-svg";

const ok = (text: string) => {
  const r = parseSvg(text);
  if (!r.ok)
    throw new Error(`expected ok, got ${r.line}:${r.col} ${r.message}`);
  return r;
};

describe("parseSvg valid", () => {
  it("returns root close offset and viewBox", () => {
    const text = `<svg viewBox="0 0 100 50"><rect/>\n</svg>`;
    const r = ok(text);
    expect(text.slice(r.rootCloseOffset)).toBe("</svg>");
    expect(r.rootSelfClosing).toBe(false);
    expect(r.viewBox).toEqual({ minX: 0, minY: 0, width: 100, height: 50 });
  });

  it("accepts the svg namespace, prolog and trailing whitespace", () => {
    const text = `<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"></svg>\n`;
    expect(text.slice(ok(text).rootCloseOffset).trim()).toBe("</svg>");
  });

  it("handles a closing tag with inner whitespace", () => {
    const text = `<svg></svg  >`;
    expect(text.slice(ok(text).rootCloseOffset)).toBe("</svg  >");
  });

  it("reports the outer close for nested svg", () => {
    const text = `<svg><svg><g/></svg></svg>`;
    expect(ok(text).rootCloseOffset).toBe(text.lastIndexOf("</svg>"));
  });

  it("ignores </svg> inside comments, CDATA and attributes", () => {
    const text = `<svg data-x="&lt;/svg>"><!-- </svg> --><desc><![CDATA[</svg>]]></desc></svg>`;
    expect(ok(text).rootCloseOffset).toBe(text.lastIndexOf("</svg>"));
  });

  it("supports a self-closing root", () => {
    const text = `<svg width="1"/>`;
    const r = ok(text);
    expect(r.rootSelfClosing).toBe(true);
    expect(text.slice(r.rootCloseOffset)).toBe("/>");
  });

  it("accepts predefined and numeric entities", () => {
    ok(`<svg><text>&lt;&amp;&gt;&quot;&apos;&#65;&#x42;</text></svg>`);
  });

  it.each([
    ["absent", `<svg/>`],
    ["malformed", `<svg viewBox="a b c d"/>`],
    ["wrong arity", `<svg viewBox="0 0 10"/>`],
    ["zero size", `<svg viewBox="0 0 0 10"/>`],
  ])("viewBox is null when %s", (_n, text) => {
    expect(ok(text).viewBox).toBeNull();
  });

  it("parses comma-separated and negative viewBox", () => {
    expect(ok(`<svg viewBox="-5,-5,10,20"/>`).viewBox).toEqual({
      minX: -5,
      minY: -5,
      width: 10,
      height: 20,
    });
  });
});

describe("parseSvg invalid", () => {
  it.each([
    ["empty", ""],
    ["whitespace", "  \n "],
    ["plain text", "hello"],
    ["unclosed root", `<svg><rect/>`],
    ["unclosed child", `<svg><g></svg>`],
    ["mismatched tags", `<svg><g></rect></svg>`],
    ["stray close", `</svg>`],
    ["unterminated tag", `<svg`],
    ["unquoted attribute", `<svg width=10></svg>`],
    ["duplicate attribute", `<svg a="1" a="2"></svg>`],
    ["bare ampersand", `<svg><text>a & b</text></svg>`],
    ["HTML entity", `<svg><text>&nbsp;</text></svg>`],
    ["unterminated comment", `<svg><!-- oops</svg>`],
    ["double dash in comment", `<svg><!-- a -- b --></svg>`],
    ["unbound prefix", `<svg><x:y/></svg>`],
    ["raw < in attribute", `<svg a="</svg>"></svg>`],
  ])("rejects %s", (_n, text) => {
    const r = parseSvg(text);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.line).toBeGreaterThanOrEqual(1);
      expect(r.col).toBeGreaterThanOrEqual(0);
      expect(r.message).not.toMatch(/^\d+:\d+:/);
      expect(r.message.length).toBeGreaterThan(0);
    }
  });

  it("rejects multiple roots", () => {
    expect(parseSvg(`<svg></svg><svg></svg>`).ok).toBe(false);
  });

  it("rejects a non-svg root", () => {
    const r = parseSvg(`<html></html>`);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/svg/);
  });

  it("rejects an svg element in a foreign namespace", () => {
    expect(parseSvg(`<svg xmlns="http://example.com/x"></svg>`).ok).toBe(false);
  });

  it("rejects trailing content after the root", () => {
    expect(parseSvg(`<svg></svg>junk`).ok).toBe(false);
  });

  it("reports line and column of the error", () => {
    const r = parseSvg(`<svg>\n  <g>\n  </rect>\n</svg>`);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.line).toBe(3);
  });
});
