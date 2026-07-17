"use client";

import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { resolveIcon } from "@/lib/icon";
import {
  archiveTrackableAction,
  deleteTrackableAction,
  logDayAction,
  restoreTrackableAction,
} from "@/modules/habits/actions";
import type { TrackableKind } from "@/modules/habits/lib/kinds";

// A plain (non-component) helper, so `resolveIcon`'s dynamic lookup doesn't
// read as "component created during render" the way calling it directly
// inside `HabitRow` would (react-hooks/static-components) — same pattern as
// `toItem`/`toCandidate` in components/dashboard/dashboard.tsx.
function kindIcon(kind: TrackableKind, className: string) {
  const Icon = resolveIcon(kind.icon);
  return <Icon className={className} aria-hidden />;
}

/**
 * One scheduled habit row (docs/modules/habits.md §3, §7): a one-tap
 * check-off for today plus its derived streak. `todayDone`/`streak`/`due`
 * are computed server-side from `habits_log` — this component only submits
 * the day's log and lets the page revalidate.
 */
export function HabitRow({
  id,
  title,
  kind,
  today,
  todayDone,
  streak,
  due,
  archived,
}: {
  id: string;
  title: string;
  kind: TrackableKind;
  today: string;
  todayDone: boolean;
  streak: number;
  due: boolean;
  archived: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function toggleToday() {
    startTransition(async () => {
      await logDayAction({
        trackableId: id,
        logDate: today,
        done: !todayDone,
      });
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-pressed={todayDone}
          aria-label={todayDone ? `Mark ${title} not done today` : `Mark ${title} done today`}
          onClick={toggleToday}
          disabled={isPending}
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-50",
            todayDone
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background hover:bg-muted",
          )}
        >
          {kindIcon(kind, "size-4")}
        </button>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">
            {streak > 0 ? `🔥 ${streak} streak` : "No streak yet"}
            {due && !todayDone ? " · due today" : ""}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={archived ? "Restore" : "Archive"}
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await (archived
                ? restoreTrackableAction(id)
                : archiveTrackableAction(id));
            })
          }
        >
          {archived ? (
            <ArchiveRestore className="size-4" aria-hidden />
          ) : (
            <Archive className="size-4" aria-hidden />
          )}
        </Button>
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
    </li>
  );
}
