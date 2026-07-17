/**
 * Title and item text are both "required" (lists.md §8): non-blank once
 * trimmed. A lone space-bar tap shouldn't pass as content.
 */
export function isBlank(value: string): boolean {
  return value.trim().length === 0;
}
