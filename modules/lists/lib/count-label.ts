import type { ListKind } from "@/modules/lists/kinds";

/**
 * The "My Lists" widget's per-row status line (lists.md §6): an unchecked-item
 * count, phrased by kind. `checkable` — the registry's designed-in extension
 * point (lists.md §1) — does real work here: a checkable list counts down to
 * "done", while a notes-style list, which never checks items off, simply
 * reports how many lines it holds.
 */
export function listCountLabel(kind: ListKind, uncheckedCount: number): string {
  if (!kind.checkable) {
    if (uncheckedCount === 0) return "empty";
    return `${uncheckedCount} ${uncheckedCount === 1 ? "line" : "lines"}`;
  }

  if (uncheckedCount === 0) return "done";
  if (kind.key === "shopping") return `${uncheckedCount} to buy`;
  return `${uncheckedCount} left`;
}
