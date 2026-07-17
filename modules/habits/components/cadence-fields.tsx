const WEEKDAY_LABELS: { value: number; label: string }[] = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

export type CadenceType = "daily" | "weekly" | "weekdays";

/**
 * The cadence inputs for a scheduled trackable (docs/modules/habits.md §3):
 * every day, N times a week, or specific weekdays. Shared between the create
 * and edit forms so the two don't drift.
 */
export function CadenceFields({
  cadenceType,
  onCadenceTypeChange,
  target,
  onTargetChange,
  weekdays,
  onToggleWeekday,
}: {
  cadenceType: CadenceType;
  onCadenceTypeChange: (type: CadenceType) => void;
  target: number;
  onTargetChange: (target: number) => void;
  weekdays: number[];
  onToggleWeekday: (day: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={cadenceType}
        onChange={(e) => onCadenceTypeChange(e.target.value as CadenceType)}
        className="h-8 rounded-lg border border-border bg-background px-2 text-sm"
        aria-label="Cadence"
      >
        <option value="daily">Every day</option>
        <option value="weekly">N times a week</option>
        <option value="weekdays">Specific weekdays</option>
      </select>

      {cadenceType === "weekly" && (
        <input
          type="number"
          min={1}
          max={7}
          value={target}
          onChange={(e) => onTargetChange(Number(e.target.value))}
          className="h-8 w-16 rounded-lg border border-border bg-background px-2 text-sm"
          aria-label="Times per week"
        />
      )}

      {cadenceType === "weekdays" && (
        <div className="flex gap-1">
          {WEEKDAY_LABELS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={weekdays.includes(value)}
              onClick={() => onToggleWeekday(value)}
              className={`h-8 rounded-lg border px-2 text-xs ${
                weekdays.includes(value)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
