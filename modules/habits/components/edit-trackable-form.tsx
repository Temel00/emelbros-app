"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { updateTrackableAction } from "@/modules/habits/actions";
import {
  CadenceFields,
  type CadenceType,
} from "@/modules/habits/components/cadence-fields";
import { ParticipantsManager } from "@/modules/habits/components/participants-manager";
import type { TrackableKind } from "@/modules/habits/lib/kinds";
import type { Database } from "@/types/database";

type Scope = Database["public"]["Enums"]["scope"];

/**
 * Renames a trackable and changes its scope/cadence/participants
 * (docs/modules/habits.md §2, §9) — everything the owner can edit after
 * creation, opened inline from a row's Edit toggle.
 */
export function EditTrackableForm({
  id,
  title,
  scope,
  kind,
  cadenceType,
  cadenceTarget,
  cadenceWeekdays,
  participants,
  onClose,
}: {
  id: string;
  title: string;
  scope: Scope;
  kind: TrackableKind;
  cadenceType: string | null;
  cadenceTarget: number | null;
  cadenceWeekdays: number[] | null;
  participants: string[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [titleValue, setTitleValue] = useState(title);
  const [scopeValue, setScopeValue] = useState<Scope>(scope);
  const [cadence, setCadence] = useState<CadenceType>(
    (cadenceType as CadenceType | null) ?? "daily",
  );
  const [target, setTarget] = useState(cadenceTarget ?? 3);
  const [weekdays, setWeekdays] = useState<number[]>(
    cadenceWeekdays ?? [1, 2, 3, 4, 5],
  );

  function toggleWeekday(day: number) {
    setWeekdays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort(),
    );
  }

  function submit() {
    if (titleValue.trim() === "") return;

    startTransition(async () => {
      await updateTrackableAction(id, {
        title: titleValue.trim(),
        scope: scopeValue,
        ...(kind.scheduled && {
          cadenceType: cadence,
          cadenceTarget: cadence === "weekly" ? target : null,
          cadenceWeekdays: cadence === "weekdays" ? weekdays : null,
        }),
      });
      onClose();
    });
  }

  return (
    <form
      className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={titleValue}
          onChange={(e) => setTitleValue(e.target.value)}
          required
          className="h-8 min-w-40 flex-1 rounded-lg border border-border bg-background px-2 text-sm"
          aria-label="Title"
        />
        <select
          value={scopeValue}
          onChange={(e) => setScopeValue(e.target.value as Scope)}
          className="h-8 rounded-lg border border-border bg-background px-2 text-sm"
          aria-label="Scope"
        >
          <option value="private">Private</option>
          <option value="participants">Participants</option>
          <option value="family">Family</option>
        </select>
      </div>

      {kind.scheduled && (
        <CadenceFields
          cadenceType={cadence}
          onCadenceTypeChange={setCadence}
          target={target}
          onTargetChange={setTarget}
          weekdays={weekdays}
          onToggleWeekday={toggleWeekday}
        />
      )}

      {scopeValue === "participants" && (
        <ParticipantsManager trackableId={id} participants={participants} />
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          Save
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
