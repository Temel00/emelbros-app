import { describe, expect, it } from "vitest";

import { tools } from "@/modules/dev-tools/tools/registry";

describe("dev-tools tool registry", () => {
  it("has unique slugs", () => {
    const slugs = tools.map((t) => t.manifest.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("has well-formed manifests and load thunks", () => {
    for (const { manifest, load } of tools) {
      expect(manifest.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(manifest.name).not.toBe("");
      expect(manifest.description).not.toBe("");
      expect(manifest.icon).not.toBe("");
      expect(typeof load).toBe("function");
    }
  });

  it("registers the svg-sandbox tool", () => {
    expect(tools.map((t) => t.manifest.slug)).toContain("svg-sandbox");
  });
});
