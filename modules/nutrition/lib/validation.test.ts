import { describe, expect, it } from "vitest";

import {
  isBlank,
  isValidAmount,
  trimToNull,
} from "@/modules/nutrition/lib/validation";

describe("isBlank", () => {
  it("treats whitespace-only text as blank", () => {
    expect(isBlank("   ")).toBe(true);
    expect(isBlank("")).toBe(true);
  });

  it("accepts real content", () => {
    expect(isBlank(" Oats ")).toBe(false);
  });
});

describe("trimToNull", () => {
  it("nulls out blank and missing optional text", () => {
    expect(trimToNull("  ")).toBeNull();
    expect(trimToNull(null)).toBeNull();
    expect(trimToNull(undefined)).toBeNull();
  });

  it("trims real content", () => {
    expect(trimToNull("  Quaker  ")).toBe("Quaker");
  });
});

describe("isValidAmount", () => {
  it("accepts zero and positive finite numbers", () => {
    expect(isValidAmount(0)).toBe(true);
    expect(isValidAmount(2.5)).toBe(true);
  });

  it("rejects negatives and non-finite values", () => {
    expect(isValidAmount(-1)).toBe(false);
    expect(isValidAmount(Number.NaN)).toBe(false);
    expect(isValidAmount(Number.POSITIVE_INFINITY)).toBe(false);
  });
});
