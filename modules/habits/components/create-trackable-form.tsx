"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { createTrackableAction } from "@/modules/habits/actions";
import {
  CadenceFields,
  type CadenceType,
} from "@/modules/habits/components/cadence-fields";
import { trackableKinds } from "@/modules/habits/lib/kinds";

/**
 * Creates a trackable (docs/modules/habits.md §9): title + kind required,
 * defaults to Private and — for the `habit` kind — `daily` cadence. Cadence
 * fields only appear for scheduled kinds; metrics skip cadence entirely.
 */
export function CreateTrackableForm() {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [kindKey, setKindKey] = useState(trackableKinds[0].key);
  const [cadenceType, setCadenceType] = useState<CadenceType>("daily");
  const [target, setTarget] = useState(3);
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);

  const kind =
    trackableKinds.find((k) => k.key === kindKey) ?? trackableKinds[0];

  function toggleWeekday(day: number) {
    setWeekdays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort(),
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
        <CadenceFields
          cadenceType={cadenceType}
          onCadenceTypeChange={setCadenceType}
          target={target}
          onTargetChange={setTarget}
          weekdays={weekdays}
          onToggleWeekday={toggleWeekday}
        />
      )}

      <div>
        <Button type="submit" size="sm" disabled={isPending}>
          Add
        </Button>
      </div>
    </form>
  );
}
