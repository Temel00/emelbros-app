"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #119 resolves.
 *
 * Variant B — "Grouped by pantry location": one flat list, grouped by where
 * the food lives (fridge/freezer/pantry/other), with an extra "Not in your
 * pantry" bucket for manual lines that don't match a pantry row. Auto vs
 * manual is a subtle inline badge rather than a structural split. Generate
 * lives in a fixed header bar and opens a modal preview before committing —
 * a bigger, more deliberate action than Variant A's inline banner. The
 * restock note is a permanent inline annotation on the checked row, always
 * visible rather than transient.
 */

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getPantryLocation } from "@/modules/nutrition/lib/locations";
import type { ShoppingListVariantProps } from "@/modules/nutrition/components/prototype-shopping-list-harness";
import {
  diffAutoLines,
  type ShoppingLine,
} from "@/modules/nutrition/components/prototype-shopping-list-shared";

const NOT_IN_PANTRY_KEY = "__not_in_pantry__";

export function VariantB(props: ShoppingListVariantProps) {
  const {
    lines,
    toggleCheck,
    addManualLine,
    removeManualLine,
    pendingScenario,
    pendingLines,
    startGenerate,
    confirmGenerate,
    cancelGenerate,
    scenarioLabel,
  } = props;

  const [addOpen, setAddOpen] = useState(false);

  const groups = groupByLocationKey(lines);
  const diff =
    pendingLines !== null ? diffAutoLines(lines, pendingLines) : null;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-20">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <h1 className="text-base font-semibold">Shopping list</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setAddOpen(true)}>
            <Plus data-icon="inline-start" />
            Add
          </Button>
          <Button size="sm" onClick={startGenerate}>
            Generate
          </Button>
        </div>
      </div>

      {groups.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nothing on the list yet — Generate to pull shortfalls from this
          week&apos;s plan, or add an item.
        </p>
      )}

      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-1.5">
          <h2 className="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {group.label}
          </h2>
          <ul className="flex flex-col gap-1">
            {group.items.map((line) => (
              <li
                key={line.id}
                className={`flex items-start gap-3 rounded-lg border border-border px-3 py-2.5 ${
                  line.checkedOff ? "bg-muted/30" : ""
                }`}
              >
                <Checkbox
                  className="mt-0.5 size-6"
                  checked={line.checkedOff}
                  onCheckedChange={() => toggleCheck(line.id)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={`truncate text-sm ${
                        line.checkedOff
                          ? "text-muted-foreground line-through"
                          : ""
                      }`}
                    >
                      {line.quantity} {line.unit} {line.displayText}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[0.65rem] font-medium ${
                        line.source === "auto"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {line.source === "auto" ? "plan" : "you"}
                    </span>
                  </div>
                  {line.checkedOff && line.restockNote && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      ✓ {line.restockNote}
                    </p>
                  )}
                </div>
                {line.source === "manual" && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Remove"
                    onClick={() => removeManualLine(line.id)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <AddLineDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={addManualLine}
      />

      <DialogRoot
        open={pendingScenario !== null}
        onOpenChange={(open) => {
          if (!open) cancelGenerate();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate shopping list</DialogTitle>
          </DialogHeader>
          {pendingScenario && diff && (
            <div className="mt-2 text-sm">
              <p className="font-medium text-muted-foreground">
                {scenarioLabel(pendingScenario)}
              </p>
              {pendingLines && pendingLines.length === 0 ? (
                <p className="mt-2 rounded-lg bg-muted/50 p-3 text-muted-foreground">
                  Nothing missing — your pantry already covers the plan.
                  Confirming will clear the auto lines below.
                </p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1">
                  {diff.added.map((l) => (
                    <li
                      key={l.id}
                      className="text-green-700 dark:text-green-400"
                    >
                      + {l.quantity} {l.unit} {l.displayText}
                    </li>
                  ))}
                  {diff.changed.map(({ previous, next }) => (
                    <li
                      key={next.id}
                      className="text-amber-700 dark:text-amber-400"
                    >
                      ~ {next.displayText}: {previous.quantity} →{" "}
                      {next.quantity} {next.unit}
                    </li>
                  ))}
                  {diff.removed.map((l) => (
                    <li
                      key={l.id}
                      className="text-muted-foreground line-through"
                    >
                      − {l.quantity} {l.unit} {l.displayText}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <DialogFooter>
            <DialogClose
              onClick={cancelGenerate}
              className={buttonVariants({ variant: "ghost" })}
            >
              Cancel
            </DialogClose>
            <Button onClick={confirmGenerate}>Replace auto lines</Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </div>
  );
}

function groupByLocationKey(lines: ShoppingLine[]) {
  const map = new Map<string, ShoppingLine[]>();
  for (const line of lines) {
    const key = line.location ?? NOT_IN_PANTRY_KEY;
    const existing = map.get(key);
    if (existing) existing.push(line);
    else map.set(key, [line]);
  }

  const groups: { key: string; label: string; items: ShoppingLine[] }[] = [];
  for (const [key, items] of map) {
    if (key === NOT_IN_PANTRY_KEY) continue;
    groups.push({ key, label: getPantryLocation(key).label, items });
  }
  const notInPantry = map.get(NOT_IN_PANTRY_KEY);
  if (notInPantry) {
    groups.push({
      key: NOT_IN_PANTRY_KEY,
      label: "Not in your pantry",
      items: notInPantry,
    });
  }
  return groups;
}

function AddLineDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (input: { displayText: string; quantity: number; unit: string }) => void;
}) {
  const [displayText, setDisplayText] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("each");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (displayText.trim().length === 0) return;
    onAdd({ displayText, quantity: Number(quantity), unit });
    setDisplayText("");
    setQuantity("1");
    setUnit("each");
    onOpenChange(false);
  }

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-3">
          <Input
            autoFocus
            value={displayText}
            onChange={(e) => setDisplayText(e.target.value)}
            placeholder="e.g. Paper towels"
          />
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-20"
            />
            <Input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="flex-1"
              placeholder="unit"
            />
          </div>
          <DialogFooter>
            <DialogClose className={buttonVariants({ variant: "ghost" })}>
              Cancel
            </DialogClose>
            <Button type="submit">Add</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
