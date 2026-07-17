"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { createTrackableAction } from "@/modules/habits/actions";
import { trackableKinds } from "@/modules/habits/lib/kinds";

const WEEKDAY_LABELS: { value: number; label: string }[] = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

/**
 * Creates a trackable (docs/modules/habits.md §9): title + kind required,
 * defaults to Private and — for the `habit` kind — `daily` cadence. Cadence
 * fields only appear for scheduled kinds; metrics skip cadence entirely.
 */
export function CreateTrackableForm() {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [kindKey, setKindKey] = useState(trackableKinds[0].key);
  const [cadenceType, setCadenceType] = useState<"daily" | "weekly" | "weekdays">(
    "daily",
  );
  const [target, setTarget] = useState(3);
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);

  const kind = trackableKinds.find((k) => k.key === kindKey) ?? trackableKinds[0];

  function toggleWeekday(day: number) {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  function submit() {
    if (title.trim() === "") return;

    startTransition(async () => {
      await createTrackableAction({
        title: title.trim(),
        kind: kind.key,
        ...(kind.scheduled && {
          cadenceType,
          cadenceTarget: cadenceType === "weekly" ? target : null,
          cadenceWeekdays: cadenceType === "weekdays" ? weekdays : null,
        }),
      });
      setTitle("");
    });
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border border-border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          required
          className="h-8 min-w-40 flex-1 rounded-lg border border-border bg-background px-2 text-sm"
          aria-label="Trackable title"
        />
        <select
          value={kindKey}
          onChange={(e) => setKindKey(e.target.value)}
          className="h-8 rounded-lg border border-border bg-background px-2 text-sm"
          aria-label="Kind"
        >
          {trackableKinds.map((k) => (
            <option key={k.key} value={k.key}>
              {k.label}
            </option>
          ))}
        </select>
      </div>

      {kind.scheduled && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={cadenceType}
            onChange={(e) =>
              setCadenceType(e.target.value as "daily" | "weekly" | "weekdays")
            }
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
              onChange={(e) => setTarget(Number(e.target.value))}
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
                  onClick={() => toggleWeekday(value)}
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
      )}

      <div>
        <Button type="submit" size="sm" disabled={isPending}>
          Add
        </Button>
      </div>
    </form>
  );
}
