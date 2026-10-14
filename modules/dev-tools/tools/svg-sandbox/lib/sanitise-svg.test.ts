// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { sanitiseSvg } from "./sanitise-svg";

const wrap = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

describe("sanitiseSvg", () => {
  it("keeps benign shapes and attributes", () => {
    const out = sanitiseSvg(
      wrap(`<rect x="1" y="2" width="3" height="4" fill="#f00"/>`),
    );
    expect(out).toContain("<rect");
    expect(out).toContain('fill="#f00"');
  });

  it("keeps viewBox on the root", () => {
    expect(sanitiseSvg(`<svg viewBox="0 0 10 10"></svg>`)).toContain(
      'viewBox="0 0 10 10"',
    );
  });

  it("removes script elements", () => {
    const out = sanitiseSvg(wrap(`<script>alert(1)</script><rect/>`));
    expect(out).not.toMatch(/script|alert/i);
    expect(out).toContain("<rect");
  });

  it("removes event handler attributes", () => {
    const out = sanitiseSvg(
      `<svg onload="alert(1)"><rect onclick="x()" onmouseover="y()"/></svg>`,
    );
    expect(out).not.toMatch(/on(load|click|mouseover)/i);
  });

  it("removes foreignObject and its HTML payload", () => {
    const out = sanitiseSvg(
      wrap(
        `<foreignObject><div>hi<img src=x onerror=alert(1)></div></foreignObject>`,
      ),
    );
    expect(out).not.toMatch(/foreignObject|<div|onerror/i);
  });

  it("removes javascript: URLs", () => {
    const out = sanitiseSvg(
      wrap(`<a href="javascript:alert(1)"><text>x</text></a>`),
    );
    expect(out).not.toMatch(/javascript/i);
  });

  it.each([
    [`<image href="https://evil.test/x.png"/>`],
    [
      `<image xlink:href="https://evil.test/x.png" xmlns:xlink="http://www.w3.org/1999/xlink"/>`,
    ],
    [`<use href="https://evil.test/a.svg#b"/>`],
    [`<rect style="fill:url(https://evil.test/x)"/>`],
    [`<rect fill="url(https://evil.test/x)"/>`],
  ])("strips external reference: %s", (inner) => {
    expect(sanitiseSvg(wrap(inner))).not.toContain("evil.test");
  });

  it("keeps same-document fragment references", () => {
    const out = sanitiseSvg(
      wrap(
        `<defs><linearGradient id="g"/></defs><rect fill="url(#g)"/><a href="#g"><text>x</text></a>`,
      ),
    );
    expect(out).toContain("url(#g)");
    expect(out).toContain('href="#g"');
  });

  it("removes style elements", () => {
    expect(
      sanitiseSvg(wrap(`<style>@import url(https://evil.test/a.css);</style>`)),
    ).not.toContain("evil.test");
  });

  it("handles nested svg", () => {
    const out = sanitiseSvg(
      wrap(`<svg><script>x</script><circle r="1"/></svg>`),
    );
    expect(out).toContain("<circle");
    expect(out).not.toContain("script");
  });

  it("drops a script hidden after a comment containing </svg>", () => {
    const out = sanitiseSvg(wrap(`<!-- </svg> --><script>alert(1)</script>`));
    expect(out).not.toMatch(/script|alert/i);
  });

  it("does not leak the hook between calls", () => {
    sanitiseSvg(wrap(`<rect/>`));
    const out = sanitiseSvg(wrap(`<rect fill="url(#a)"/>`));
    expect(out).toContain("url(#a)");
  });

  it("returns an empty string for empty input", () => {
    expect(sanitiseSvg("")).toBe("");
  });
});
