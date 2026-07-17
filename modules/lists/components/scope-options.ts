import type { Scope } from "@/modules/lists/queries";

/** The fixed three-value Scope enum's `<option>`s, shared by every scope picker. */
export const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: "private", label: "Private" },
  { value: "participants", label: "Participants" },
  { value: "family", label: "Family" },
];
