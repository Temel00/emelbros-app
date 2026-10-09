import { describe, expect, it } from "vitest";

import { brightForSlug } from "@/modules/dev-tools/lib/bright";

describe("brightForSlug", () => {
  it("is stable for a given slug", () => {
    expect(brightForSlug("svg-sandbox")).toBe(brightForSlug("svg-sandbox"));
  });

  it("pins known slugs so hash changes are noticed", () => {
    expect(brightForSlug("svg-sandbox").icon).toBe("text-c-blue");
    expect(brightForSlug("json-formatter").icon).toBe("text-c-pink");
  });

  it("pairs the icon tint with the matching stripe", () => {
    for (const slug of ["a", "b", "c", "svg-sandbox", "color-picker"]) {
      const { icon, stripe } = brightForSlug(slug);
      expect(stripe).toBe(icon.replace("text-", "bg-"));
    }
  });

  it("uses all four brights across a spread of slugs", () => {
    const slugs = Array.from({ length: 40 }, (_, i) => `tool-${i}`);
    expect(new Set(slugs.map((s) => brightForSlug(s).icon)).size).toBe(4);
  });
});
