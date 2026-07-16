import { describe, expect, it } from "vitest";

import { modules } from "@/modules";

// Trivial test proving the Vitest runner and the `@/*` alias both work (#23).
describe("module registry", () => {
  it("is an array", () => {
    expect(Array.isArray(modules)).toBe(true);
  });
});
