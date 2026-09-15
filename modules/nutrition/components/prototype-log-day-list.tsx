"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #122 resolves.
 *
 * The day list — shared across all three variants since the ticket's
 * structural question is about the three logging *paths*, not this list.
 * Row pattern lifted from `shopping-list-view.tsx`'s `ShoppingListRow`
 * (checkbox swapped for a source icon; Edit/Delete kept, plus a "log again"
 * repeat action for the fastest-repeat-logging requirement).
 */
import { Copy, Pencil, Trash2 } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatTime,
  ROUGH_GUESS_MACROS,
  type MockLogEntry,
} from "@/modules/nutrition/components/prototype-log-shared";

function sourceIcon(source: MockLogEntry["source"]) {
  switch (source) {
    case "recipe":
      return "🍳";
    case "food":
      return "📦";
    case "freeform":
      return "✍️";
  }
}

export function LogDayList({
  entries,
  onEdit,
  onDelete,
  onRepeat,
}: {
  entries: MockLogEntry[];
  onEdit: (id: string, patch: Partial<MockLogEntry>) => void;
  onDelete: (id: string) => void;
  onRepeat: (entry: MockLogEntry) => void;
}) {
  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        Nothing logged yet today.
      </p>
    );
  }

  const totalCalories = entries.reduce((sum, e) => sum + e.calories, 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold">Today</h2>
        <span className="text-xs text-muted-foreground">
          {totalCalories} kcal total
        </span>
      </div>
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {entries.map((entry) => (
          <LogRow
            key={entry.id}
            entry={entry}
            onEdit={onEdit}
            onDelete={onDelete}
            onRepeat={onRepeat}
          />
        ))}
      </ul>
    </div>
  );
}

function LogRow({
  entry,
  onEdit,
  onDelete,
  onRepeat,
}: {
  entry: MockLogEntry;
  onEdit: (id: string, patch: Partial<MockLogEntry>) => void;
  onDelete: (id: string) => void;
  onRepeat: (entry: MockLogEntry) => void;
}) {
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <span aria-hidden className="text-lg">
        {sourceIcon(entry.source)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.displayText}</p>
        <p className="truncate text-xs text-muted-foreground">
          {entry.detail} · {formatTime(entry.loggedAt)} · {entry.calories} kcal
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Log ${entry.displayText} again`}
        onClick={() => onRepeat(entry)}
      >
        <Copy className="size-4" />
      </Button>
      <EditEntryDialog entry={entry} onSave={onEdit} />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete ${entry.displayText}`}
        onClick={() => onDelete(entry.id)}
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}

function EditEntryDialog({
  entry,
  onSave,
}: {
  entry: MockLogEntry;
  onSave: (id: string, patch: Partial<MockLogEntry>) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(String(entry.quantity ?? ""));
  const [portion, setPortion] = useState(String(entry.portionMultiplier ?? ""));
  const [description, setDescription] = useState(entry.displayText);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (entry.source === "food" && entry.quantity !== undefined) {
      const q = Number(quantity);
      const perUnitCalories = entry.calories / entry.quantity;
      onSave(entry.id, {
        quantity: q,
        detail: `${q} ${entry.unit}`,
        calories: Math.round(perUnitCalories * q),
      });
    } else if (
      entry.source === "recipe" &&
      entry.portionMultiplier !== undefined
    ) {
      const p = Number(portion);
      const perPortionCalories = entry.calories / entry.portionMultiplier;
      onSave(entry.id, {
        portionMultiplier: p,
        detail: p === 1 ? "1 planned portion" : `${p}× planned portion`,
        calories: Math.round(perPortionCalories * p),
      });
    } else {
      onSave(entry.id, { displayText: description });
    }
    setOpen(false);
  }

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Edit ${entry.displayText}`}
        onClick={() => setOpen(true)}
      >
        <Pencil className="size-4" />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {entry.source === "food" && (
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${id}-qty`}>Quantity ({entry.unit})</Label>
              <Input
                id={`${id}-qty`}
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                autoFocus
              />
            </div>
          )}
          {entry.source === "recipe" && (
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${id}-portion`}>Portion multiplier</Label>
              <Input
                id={`${id}-portion`}
                type="number"
                inputMode="decimal"
                step="0.25"
                min="0.25"
                value={portion}
                onChange={(e) => setPortion(e.target.value)}
                autoFocus
              />
            </div>
          )}
          {entry.source === "freeform" && (
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${id}-desc`}>Description</Label>
              <Input
                id={`${id}-desc`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Rough guess:{" "}
                {entry.roughGuess
                  ? ROUGH_GUESS_MACROS[entry.roughGuess].label
                  : "—"}
              </p>
            </div>
          )}
          <DialogFooter>
            <DialogClose className={buttonVariants({ variant: "ghost" })}>
              Cancel
            </DialogClose>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
