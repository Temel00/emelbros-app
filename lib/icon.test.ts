import { Dumbbell, LayoutGrid } from "lucide-react";
import { describe, expect, it } from "vitest";

import { resolveIcon } from "@/lib/icon";

describe("resolveIcon", () => {
  it("resolves a known Lucide icon name", () => {
    expect(resolveIcon("Dumbbell")).toBe(Dumbbell);
  });

  it("falls back to LayoutGrid for an unknown name", () => {
    expect(resolveIcon("NotARealIcon")).toBe(LayoutGrid);
  });
});
