import { describe, expect, it } from "vitest";

import {
  ACCENT_BG,
  ACCENT_BORDER_TOP,
  ACCENT_RING,
  ACCENT_TEXT,
  isMemberAccent,
  MEMBER_ACCENTS,
} from "@/lib/accent";

// Per-member accent enum + identity-surface class mapping (#18).
describe("member accent", () => {
  it("is an enum of exactly the four brand brights", () => {
    expect(MEMBER_ACCENTS).toEqual(["pink", "yellow", "green", "blue"]);
  });

  it("has a class mapping for every accent on every identity surface", () => {
    for (const accent of MEMBER_ACCENTS) {
      expect(ACCENT_BG[accent]).toBe(`bg-c-${accent}`);
      expect(ACCENT_TEXT[accent]).toBe(`text-c-${accent}`);
      expect(ACCENT_BORDER_TOP[accent]).toBe(`border-t-c-${accent}`);
      expect(ACCENT_RING[accent]).toBe(`ring-c-${accent}`);
    }
  });

  it("rejects values outside the enum", () => {
    expect(isMemberAccent("pink")).toBe(true);
    expect(isMemberAccent("graphite")).toBe(false);
  });
});
