import { describe, expect, it } from "vitest";

import { validateBean, validateGrindProfile } from "./validation";

describe("validateBean", () => {
  it("trims fields and turns blanks into null", () => {
    expect(
      validateBean({
        name: "  Ethiopia ",
        roaster: " ",
        origin: "Guji",
        roastLevel: "",
      }),
    ).toEqual({
      ok: true,
      value: {
        name: "Ethiopia",
        roaster: null,
        origin: "Guji",
        notes: null,
        roast_level: null,
      },
    });
  });

  it("rejects a blank name", () => {
    expect(validateBean({ name: "   " }).ok).toBe(false);
  });

  it.each(["light", "medium-light", "medium", "medium-dark", "dark"])(
    "accepts roast level %s",
    (roastLevel) => {
      expect(validateBean({ name: "x", roastLevel }).ok).toBe(true);
    },
  );

  it("rejects an unknown roast level", () => {
    expect(validateBean({ name: "x", roastLevel: "burnt" }).ok).toBe(false);
  });
});

describe("validateGrindProfile", () => {
  it("accepts the range bounds and normalises", () => {
    expect(
      validateGrindProfile({ label: " Espresso ", grindSize: "0" }),
    ).toEqual({
      ok: true,
      value: { label: "Espresso", description: null, grind_size: 0 },
    });
    expect(validateGrindProfile({ label: "x", grindSize: 99.99 }).ok).toBe(
      true,
    );
  });

  it("rounds to two decimals", () => {
    const result = validateGrindProfile({ label: "x", grindSize: "12.346" });
    expect(result.ok && result.value.grind_size).toBe(12.35);
  });

  it("rejects a blank label", () => {
    expect(validateGrindProfile({ label: " ", grindSize: 5 }).ok).toBe(false);
  });

  it.each(["", "abc", "-1", "100", "99.999"])(
    "rejects grind size %j",
    (grindSize) => {
      expect(validateGrindProfile({ label: "x", grindSize }).ok).toBe(false);
    },
  );
});
