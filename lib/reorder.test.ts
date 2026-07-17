import { describe, expect, it } from "vitest";

import { moveItem } from "@/lib/reorder";

describe("moveItem", () => {
  it("swaps with the previous item when moving up", () => {
    expect(moveItem(["a", "b", "c"], 1, "up")).toEqual(["b", "a", "c"]);
  });

  it("swaps with the next item when moving down", () => {
    expect(moveItem(["a", "b", "c"], 1, "down")).toEqual(["a", "c", "b"]);
  });

  it("is a no-op moving the first item up", () => {
    expect(moveItem(["a", "b", "c"], 0, "up")).toEqual(["a", "b", "c"]);
  });

  it("is a no-op moving the last item down", () => {
    expect(moveItem(["a", "b", "c"], 2, "down")).toEqual(["a", "b", "c"]);
  });

  it("does not mutate the input array", () => {
    const items = ["a", "b", "c"];
    moveItem(items, 0, "down");
    expect(items).toEqual(["a", "b", "c"]);
  });
});
