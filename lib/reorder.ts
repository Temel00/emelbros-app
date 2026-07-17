/**
 * Swaps an item with its neighbour — the only reordering move the dashboard's
 * Edit mode offers (#27, prototype #8): up/down within a zone, never a free
 * drag to an arbitrary index.
 */
export function moveItem<T>(
  items: T[],
  index: number,
  direction: "up" | "down",
): T[] {
  const target = direction === "up" ? index - 1 : index + 1;
  if (
    index < 0 ||
    index >= items.length ||
    target < 0 ||
    target >= items.length
  ) {
    return items;
  }

  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
