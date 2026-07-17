"use client";

import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  archiveTrackableAction,
  deleteTrackableAction,
  restoreTrackableAction,
} from "@/modules/habits/actions";

/**
 * The owner-only actions every trackable row offers — edit, archive/restore
 * (soft), delete (docs/modules/habits.md §4, §9) — shared between
 * `HabitRow` and `MetricRow` rather than duplicated per kind.
 */
export function TrackableActions({
  id,
  title,
  archived,
  editing,
  onToggleEdit,
}: {
  id: string;
  title: string;
  archived: boolean;
  editing: boolean;
  onToggleEdit: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={editing ? "Close edit" : "Edit"}
        aria-pressed={editing}
        onClick={onToggleEdit}
      >
        <Pencil className="size-4" aria-hidden />
      </Button>
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
  );
}
