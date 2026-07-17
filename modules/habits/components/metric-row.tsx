"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { resolveIcon } from "@/lib/icon";
import {
  deleteTrackableAction,
  logDayAction,
} from "@/modules/habits/actions";
import type { TrackableKind } from "@/modules/habits/lib/kinds";
import { TrendChart } from "@/modules/habits/components/trend-chart";

// A plain (non-component) helper, so `resolveIcon`'s dynamic lookup doesn't
// read as "component created during render" the way calling it directly
// inside `MetricRow` would (react-hooks/static-components) — same pattern as
// `toItem`/`toCandidate` in components/dashboard/dashboard.tsx.
function kindIcon(kind: TrackableKind, className: string) {
  const Icon = resolveIcon(kind.icon);
  return <Icon className={className} aria-hidden />;
}

/**
 * One unscheduled metric row (docs/modules/habits.md §1, §4): a value input
 * for today (or a backfilled date) plus its trend. No due/streak — metrics
 * just chart whatever's been logged.
 */
export function MetricRow({
  id,
  title,
  kind,
  today,
  points,
}: {
  id: string;
  title: string;
  kind: TrackableKind;
  today: string;
  points: { date: string; value: number }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(today);
  const [value, setValue] = useState("");

  function submit() {
    const parsed = Number(value);
    if (value.trim() === "" || Number.isNaN(parsed)) return;

    startTransition(async () => {
      await logDayAction({ trackableId: id, logDate: date, value: parsed });
      setValue("");
    });
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {kindIcon(kind, "size-4 text-muted-foreground")}
          <p className="text-sm font-medium">{title}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Delete"
          disabled={isPending}
          onClick={() => {
            if (confirm(`Delete "${title}" and all its history?`)) {
              startTransition(async () => {
                await deleteTrackableAction(id);
              });
            }
          }}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>

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
        <Button type="submit" size="sm" disabled={isPending}>
          Log
        </Button>
      </form>
    </li>
  );
}
