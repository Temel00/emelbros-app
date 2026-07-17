import { describe, expect, it } from "vitest";

import { modules } from "@/modules";

describe("module registry", () => {
  it("is an array", () => {
    expect(Array.isArray(modules)).toBe(true);
  });

  it("registers the darts module", () => {
    const darts = modules.find((mod) => mod.slug === "darts");
    expect(darts).toBeDefined();
    expect(darts?.scopes).toContainEqual({
      table: "darts_game",
      policy: "fixed",
      scope: "family",
    });
    expect(darts?.widgets).toHaveLength(1);
    expect(darts?.profileSections).toEqual([]);
  });
});
