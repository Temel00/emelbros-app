import { describe, expect, it } from "vitest";

import {
  isBlank,
  isServingsCount,
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

describe("isServingsCount", () => {
  it("accepts a whole number of servings", () => {
    expect(isServingsCount(4)).toBe(true);
  });

  it("rejects zero, negatives and fractions", () => {
    expect(isServingsCount(0)).toBe(false);
    expect(isServingsCount(-2)).toBe(false);
    expect(isServingsCount(1.5)).toBe(false);
  });

  it("rejects what a blank or overflowing form field produces", () => {
    expect(isServingsCount(Number(""))).toBe(false);
    expect(isServingsCount(Number("nope"))).toBe(false);
    expect(isServingsCount(Number("1e999"))).toBe(false);
  });
});
