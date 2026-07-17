import { describe, expect, it } from "vitest";

import { isBlank } from "@/modules/lists/lib/validation";

describe("isBlank", () => {
  it("is true for an empty string", () => {
    expect(isBlank("")).toBe(true);
  });

  it("is true for whitespace only", () => {
    expect(isBlank("   \n\t")).toBe(true);
  });

  it("is false for text with non-whitespace content", () => {
    expect(isBlank("Milk")).toBe(false);
  });

  it("is false for text surrounded by whitespace", () => {
    expect(isBlank("  Milk  ")).toBe(false);
  });
});
