"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { deleteLogAction, logDayAction } from "@/modules/habits/actions";

/**
 * Backfills, corrects, or un-logs a past day for a scheduled habit
 * (docs/modules/habits.md §4: "the owner may log a past date... clear
 * `done`... or delete the day's row"), with an optional note.
 */
export function BackfillForm({
  trackableId,
  today,
  onClose,
}: {
  trackableId: string;
  today: string;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(today);
  const [done, setDone] = useState(true);
  const [note, setNote] = useState("");

  function save() {
    startTransition(async () => {
      await logDayAction({
        trackableId,
        logDate: date,
        done,
        note: note.trim() === "" ? null : note.trim(),
      });
      setNote("");
    });
  }

  function clearDay() {
    startTransition(async () => {
      await deleteLogAction(trackableId, date);
      setNote("");
    });
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border p-2 text-xs"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <input
        type="date"
        value={date}
        max={today}
        onChange={(e) => setDate(e.target.value)}
        className="h-7 rounded-lg border border-border bg-background px-2"
        aria-label="Date to log"
      />
      <select
        value={done ? "done" : "not-done"}
        onChange={(e) => setDone(e.target.value === "done")}
        className="h-7 rounded-lg border border-border bg-background px-2"
        aria-label="Done status for this date"
      >
        <option value="done">Done</option>
        <option value="not-done">Not done</option>
      </select>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="h-7 min-w-24 flex-1 rounded-lg border border-border bg-background px-2"
        aria-label="Note for this entry"
      />
      <Button type="submit" size="xs" disabled={isPending}>
        Save
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        disabled={isPending}
        onClick={clearDay}
      >
        Clear day
      </Button>
      <Button type="button" variant="ghost" size="xs" onClick={onClose}>
        Close
      </Button>
    </form>
  );
}
