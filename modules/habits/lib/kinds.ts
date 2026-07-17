/**
 * The habits kind registry (docs/modules/habits.md §1) — the module's
 * designed-in extension point, in code rather than the database. A kind's
 * `valueType` decides whether a log entry is a checkbox or a number;
 * `scheduled` decides whether it carries a cadence, "due today", and a
 * streak (§3).
 */
export type TrackableKind = {
  /** Stored on the trackable row, e.g. "weight". */
  key: string;
  label: string;
  /** Lucide icon name, resolved by `resolveIcon` (falls back if unknown). */
  icon: string;
  valueType: "boolean" | "number";
  /** Unit for `number` kinds: "kg", "hrs", "min". */
  unit?: string;
  scheduled: boolean;
};

export const trackableKinds: TrackableKind[] = [
  {
    key: "habit",
    label: "Habit",
    icon: "CircleCheckBig",
    valueType: "boolean",
    scheduled: true,
  },
  {
    key: "weight",
    label: "Weight",
    icon: "Scale",
    valueType: "number",
    unit: "kg",
    scheduled: false,
  },
  {
    key: "sleep",
    label: "Sleep",
    icon: "Moon",
    valueType: "number",
    unit: "hrs",
    scheduled: false,
  },
  {
    key: "exercise",
    label: "Exercise",
    icon: "Dumbbell",
    valueType: "number",
    unit: "min",
    scheduled: false,
  },
];

/**
 * Resolves a trackable's stored `kind` string to its registry entry. Kinds
 * are additive and forgiving (§1): an unrecognised key renders as a
 * generic, unscheduled, boolean kind rather than erroring.
 */
export function getTrackableKind(key: string): TrackableKind {
  return (
    trackableKinds.find((kind) => kind.key === key) ?? {
      key,
      label: "Habit",
      icon: "CircleCheckBig",
      valueType: "boolean",
      scheduled: false,
    }
  );
}
