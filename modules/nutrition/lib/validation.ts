/**
 * Input rules shared by the nutrition server actions. The database enforces
 * the same shapes as constraints (the migration's `*_not_blank` and
 * `*_non_negative` checks); these exist so a bad form submission comes back
 * as a readable message rather than a raw Postgres error.
 */

/** Required text is non-blank once trimmed — a lone space isn't content. */
export function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

/** Optional text: trimmed, or null when it was blank/absent. */
export function trimToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * A quantity or macro value: finite and not negative. Rejects `NaN` and
 * `Infinity`, which `Number("")` and `Number("1e999")` produce from a form
 * field that looked numeric.
 */
export function isValidAmount(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}
