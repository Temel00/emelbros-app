"use client";

import { CalendarClock } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logDayAction } from "@/modules/habits/actions";
import { BackfillForm } from "@/modules/habits/components/backfill-form";
import { EditTrackableForm } from "@/modules/habits/components/edit-trackable-form";
import { kindIcon } from "@/modules/habits/components/kind-icon";
import { TrackableActions } from "@/modules/habits/components/trackable-actions";
import type { TrackableKind } from "@/modules/habits/lib/kinds";
import type { Database } from "@/types/database";

type Scope = Database["public"]["Enums"]["scope"];

/**
 * One scheduled habit row (docs/modules/habits.md §3, §7): a one-tap
 * check-off for today plus its derived streak, with backfill/edit toggles
 * for the rest of the log lifecycle (§4) and trackable CRUD (§9).
 * `todayDone`/`streak`/`due` are computed server-side from `habits_log` —
 * this component only submits actions and lets the page revalidate.
 */
export function HabitRow({
  id,
  title,
  kind,
  scope,
  cadenceType,
  cadenceTarget,
  cadenceWeekdays,
  participants,
  today,
  todayDone,
  streak,
  due,
  archived,
}: {
  id: string;
  title: string;
  kind: TrackableKind;
  scope: Scope;
  cadenceType: string | null;
  cadenceTarget: number | null;
  cadenceWeekdays: number[] | null;
  participants: string[];
  today: string;
  todayDone: boolean;
  streak: number;
  due: boolean;
  archived: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

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
    <li className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-pressed={todayDone}
            aria-label={
              todayDone
                ? `Mark ${title} not done today`
                : `Mark ${title} done today`
            }
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
            aria-label={
              backfilling ? "Close backfill" : "Backfill or edit a day"
            }
            aria-pressed={backfilling}
            onClick={() => setBackfilling((prev) => !prev)}
          >
            <CalendarClock className="size-4" aria-hidden />
          </Button>
          <TrackableActions
            id={id}
            title={title}
            archived={archived}
            editing={editing}
            onToggleEdit={() => setEditing((prev) => !prev)}
          />
        </div>
      </div>

      {backfilling && (
        <BackfillForm
          trackableId={id}
          today={today}
          onClose={() => setBackfilling(false)}
        />
      )}

      {editing && (
        <EditTrackableForm
          id={id}
          title={title}
          scope={scope}
          kind={kind}
          cadenceType={cadenceType}
          cadenceTarget={cadenceTarget}
          cadenceWeekdays={cadenceWeekdays}
          participants={participants}
          onClose={() => setEditing(false)}
        />
      )}
    </li>
  );
}
