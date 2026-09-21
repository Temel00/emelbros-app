/**
 * Derives the immutable primary `key` a new managed-vocabulary row is stored
 * under, from its human label. A unit/location `key` is the stable slug the
 * FKs reference (ADR-0017) and never changes after creation, so it is
 * generated once, here, at insert time — a rename only touches the label.
 *
 * The slug is lower-cased, and every run of characters that is not a letter or
 * digit collapses to a single underscore, with leading/trailing underscores
 * trimmed. This matches the seeded keys (e.g. `"fl oz"` → `"fl_oz"`).
 */
export function vocabularyKey(label: string): string {
  const key = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (key === "") {
    throw new Error(
      "Cannot derive a key from a label with no letters or digits",
    );
  }

  return key;
}
