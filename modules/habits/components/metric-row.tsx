"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { logDayAction } from "@/modules/habits/actions";
import { EditTrackableForm } from "@/modules/habits/components/edit-trackable-form";
import { kindIcon } from "@/modules/habits/components/kind-icon";
import { TrackableActions } from "@/modules/habits/components/trackable-actions";
import type { TrackableKind } from "@/modules/habits/lib/kinds";
import { TrendChart } from "@/modules/habits/components/trend-chart";
import type { Database } from "@/types/database";

type Scope = Database["public"]["Enums"]["scope"];

/**
 * One unscheduled metric row (docs/modules/habits.md §1, §4): a value input
 * for today (or a backfilled date) plus its trend. No due/streak — metrics
 * just chart whatever's been logged.
 */
export function MetricRow({
  id,
  title,
  kind,
  scope,
  participants,
  today,
  points,
  archived,
}: {
  id: string;
  title: string;
  kind: TrackableKind;
  scope: Scope;
  participants: string[];
  today: string;
  points: { date: string; value: number }[];
  archived: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(today);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");

  function submit() {
    const parsed = Number(value);
    if (value.trim() === "" || Number.isNaN(parsed)) return;

    startTransition(async () => {
      await logDayAction({
        trackableId: id,
        logDate: date,
        value: parsed,
        note: note.trim() === "" ? null : note.trim(),
      });
      setValue("");
      setNote("");
    });
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {kindIcon(kind, "size-4 text-muted-foreground")}
          <p className="text-sm font-medium">{title}</p>
        </div>
        <TrackableActions
          id={id}
          title={title}
          archived={archived}
          editing={editing}
          onToggleEdit={() => setEditing((prev) => !prev)}
        />
      </div>

      {editing && (
        <EditTrackableForm
          id={id}
          title={title}
          scope={scope}
          kind={kind}
          cadenceType={null}
          cadenceTarget={null}
          cadenceWeekdays={null}
          participants={participants}
          onClose={() => setEditing(false)}
        />
      )}

      <TrendChart points={points} />

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          className="h-8 rounded-lg border border-border bg-background px-2 text-sm"
          aria-label={`Date for ${title} entry`}
        />
        <input
          type="number"
          inputMode="decimal"
          step="any"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={kind.unit ? `Value (${kind.unit})` : "Value"}
          className="h-8 w-28 rounded-lg border border-border bg-background px-2 text-sm"
          aria-label={`Value for ${title} entry`}
        />
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="h-8 min-w-32 flex-1 rounded-lg border border-border bg-background px-2 text-sm"
          aria-label={`Note for ${title} entry`}
        />
        <Button type="submit" size="sm" disabled={isPending}>
          Log
        </Button>
      </form>
    </li>
  );
}
