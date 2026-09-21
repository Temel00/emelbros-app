import { describe, expect, it } from "vitest";

import { vocabularyKey } from "@/modules/nutrition/lib/vocabulary-key";

describe("vocabularyKey", () => {
  it("lower-cases a simple label", () => {
    expect(vocabularyKey("Cup")).toBe("cup");
    expect(vocabularyKey("Fridge")).toBe("fridge");
  });

  it("collapses spaces and punctuation to single underscores", () => {
    expect(vocabularyKey("fl oz")).toBe("fl_oz");
    expect(vocabularyKey("Deep  Freezer")).toBe("deep_freezer");
    expect(vocabularyKey("tbsp.")).toBe("tbsp");
  });

  it("trims leading and trailing separators", () => {
    expect(vocabularyKey("  Pantry  ")).toBe("pantry");
    expect(vocabularyKey("(other)")).toBe("other");
  });

  it("keeps digits", () => {
    expect(vocabularyKey("Shelf 2")).toBe("shelf_2");
  });

  it("throws when no letters or digits survive", () => {
    expect(() => vocabularyKey("   ")).toThrow();
    expect(() => vocabularyKey("!!!")).toThrow();
  });
});
