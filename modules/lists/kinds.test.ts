import { describe, expect, it } from "vitest";

import { getListKind, listKinds } from "@/modules/lists/kinds";

describe("listKinds", () => {
  it("ships the three v1 kinds", () => {
    expect(listKinds().map((kind) => kind.key)).toEqual([
      "shopping",
      "todo",
      "notes",
    ]);
  });
});

describe("getListKind", () => {
  it("resolves a known kind", () => {
    expect(getListKind("shopping")).toEqual({
      key: "shopping",
      label: "Shopping",
      icon: "ShoppingCart",
      checkable: true,
    });
  });

  it("notes is not checkable", () => {
    expect(getListKind("notes").checkable).toBe(false);
  });

  it("falls back to a default, checkable rendering for an unknown key", () => {
    const fallback = getListKind("packing");
    expect(fallback.checkable).toBe(true);
    expect(fallback.key).not.toBe("packing");
  });
});
