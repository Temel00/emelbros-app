import { describe, expect, it } from "vitest";

import { listCountLabel } from "@/modules/lists/lib/count-label";
import type { ListKind } from "@/modules/lists/kinds";

const shopping: ListKind = {
  key: "shopping",
  label: "Shopping",
  icon: "ShoppingCart",
  checkable: true,
};
const todo: ListKind = {
  key: "todo",
  label: "To-do",
  icon: "ListChecks",
  checkable: true,
};
const notes: ListKind = {
  key: "notes",
  label: "Notes",
  icon: "NotebookPen",
  checkable: false,
};

describe("listCountLabel", () => {
  it("phrases a shopping count as 'to buy'", () => {
    expect(listCountLabel(shopping, 4)).toBe("4 to buy");
  });

  it("phrases a generic checkable count as 'left'", () => {
    expect(listCountLabel(todo, 2)).toBe("2 left");
  });

  it("reads 'done' for a checkable list with nothing unchecked", () => {
    expect(listCountLabel(shopping, 0)).toBe("done");
    expect(listCountLabel(todo, 0)).toBe("done");
  });

  it("counts lines for a non-checkable list rather than checking them off", () => {
    expect(listCountLabel(notes, 3)).toBe("3 lines");
  });

  it("singularises a one-line non-checkable list", () => {
    expect(listCountLabel(notes, 1)).toBe("1 line");
  });

  it("reads 'empty' for a non-checkable list with no items", () => {
    expect(listCountLabel(notes, 0)).toBe("empty");
  });
});
