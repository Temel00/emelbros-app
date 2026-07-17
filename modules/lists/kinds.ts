/**
 * The lists module's designed-in extension point (lists.md §1): a code-side
 * registry, not a database table. Adding a kind is appending an entry here;
 * a migration is only needed when a kind wants columns the base list/item
 * don't already have.
 */
export type ListKind = {
  /** Stored verbatim on `lists_list.kind`. */
  key: string;
  label: string;
  icon: string;
  /** Whether items of this kind show a checkbox. */
  checkable: boolean;
};

const LIST_KINDS: ListKind[] = [
  { key: "shopping", label: "Shopping", icon: "ShoppingCart", checkable: true },
  { key: "todo", label: "To-do", icon: "ListChecks", checkable: true },
  { key: "notes", label: "Notes", icon: "NotebookPen", checkable: false },
];

/**
 * Default rendering for a stored `kind` that isn't (or is no longer) in the
 * registry — kinds are additive and forgiving, never a reason to error.
 */
const DEFAULT_KIND: ListKind = {
  key: "default",
  label: "List",
  icon: "List",
  checkable: true,
};

export function listKinds(): ListKind[] {
  return LIST_KINDS;
}

export function getListKind(key: string): ListKind {
  return LIST_KINDS.find((kind) => kind.key === key) ?? DEFAULT_KIND;
}
