"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #119 resolves.
 *
 * Variant E — "Edit dialog, badge nudge": Variant B's grouped-by-location
 * shape, but editing happens in a focused dialog rather than inline — the
 * row itself stays a pencil-tap away, and the dialog surfaces the pantry
 * link (food name, current stock, location) as a read-only block rather
 * than mixing it into the editable fields. The "you're short" nudge is a
 * small count badge riding on the Generate button instead of a banner.
 * Copy-as-CSV is an icon button with a brief toast-style confirmation pill.
 */

import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Select } from "@/components/ui/select";
import { getPantryLocation } from "@/modules/nutrition/lib/locations";
import type { ShoppingListVariantProps } from "@/modules/nutrition/components/prototype-shopping-list-harness";
import {
  diffAutoLines,
  findPantryStock,
  linesToCsv,
  type ShoppingLine,
} from "@/modules/nutrition/components/prototype-shopping-list-shared";
import {
  DEFAULT_PANTRY_UNIT_KEY,
  formatQuantityUnit,
  getPantryUnit,
  isCanonicalPantryUnit,
  PANTRY_UNITS,
} from "@/modules/nutrition/components/prototype-shopping-list-units";
import type { PantryItemWithFood } from "@/modules/nutrition/queries";

const NOT_IN_PANTRY_KEY = "__not_in_pantry__";

export function VariantE(props: ShoppingListVariantProps) {
  const {
    lines,
    pantryItems,
    toggleCheck,
    addManualLine,
    removeManualLine,
    updateLine,
    pendingScenario,
    pendingLines,
    startGenerate,
    confirmGenerate,
    cancelGenerate,
    scenarioLabel,
    shortageHint,
  } = props;

  const [addOpen, setAddOpen] = useState(false);
  const [editLine, setEditLine] = useState<ShoppingLine | null>(null);
  const [toast, setToast] = useState(false);

  const groups = groupByLocationKey(lines);
  const diff =
    pendingLines !== null ? diffAutoLines(lines, pendingLines) : null;

  function copyCsv() {
    navigator.clipboard.writeText(linesToCsv(lines)).then(() => {
      setToast(true);
      setTimeout(() => setToast(false), 1800);
    });
  }

  return (
    <div className="relative mx-auto flex w-full max-w-lg flex-col gap-4 pb-20">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <h1 className="text-base font-semibold">Shopping list</h1>
        <div className="flex gap-2">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Copy as CSV"
            onClick={copyCsv}
          >
            <Copy />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAddOpen(true)}>
            <Plus data-icon="inline-start" />
            Add
          </Button>
          <div className="relative">
            <Button size="sm" onClick={startGenerate}>
              Generate
            </Button>
            {shortageHint && (
              <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[0.6rem] font-semibold text-destructive-foreground">
                {shortageHint.count}
              </span>
            )}
          </div>
        </div>
      </div>

      {shortageHint && (
        <p className="px-1 text-xs text-muted-foreground">
          {shortageHint.text}
        </p>
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-20 -translate-x-1/2 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-lg">
          Copied {lines.length} items as CSV
        </div>
      )}

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
                <button
                  type="button"
                  onClick={() => setEditLine(line)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <p
                      className={`truncate text-sm ${
                        line.checkedOff
                          ? "text-muted-foreground line-through"
                          : ""
                      }`}
                    >
                      {formatQuantityUnit(line.quantity, line.unit)}{" "}
                      {line.displayText}
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
                </button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Edit"
                  onClick={() => setEditLine(line)}
                >
                  <Pencil />
                </Button>
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

      <EditLineDialog
        line={editLine}
        pantryItems={pantryItems}
        onOpenChange={(open) => {
          if (!open) setEditLine(null);
        }}
        onSave={(patch) => {
          if (editLine) updateLine(editLine.id, patch);
          setEditLine(null);
        }}
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
                      + {formatQuantityUnit(l.quantity, l.unit)} {l.displayText}
                    </li>
                  ))}
                  {diff.changed.map(({ previous, next }) => (
                    <li
                      key={next.id}
                      className="text-amber-700 dark:text-amber-400"
                    >
                      ~ {next.displayText}:{" "}
                      {formatQuantityUnit(previous.quantity, previous.unit)} →{" "}
                      {formatQuantityUnit(next.quantity, next.unit)}
                    </li>
                  ))}
                  {diff.removed.map((l) => (
                    <li
                      key={l.id}
                      className="text-muted-foreground line-through"
                    >
                      − {formatQuantityUnit(l.quantity, l.unit)} {l.displayText}
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

function EditLineDialog({
  line,
  pantryItems,
  onOpenChange,
  onSave,
}: {
  line: ShoppingLine | null;
  pantryItems: PantryItemWithFood[];
  onOpenChange: (open: boolean) => void;
  onSave: (patch: {
    displayText: string;
    quantity: number;
    unit: string;
  }) => void;
}) {
  const [displayText, setDisplayText] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState(DEFAULT_PANTRY_UNIT_KEY);

  const stock = line ? findPantryStock(pantryItems, line.foodId) : null;

  // A real pantry line's unit can be anything (free text today — see
  // prototype-shopping-list-units.ts) so the dropdown keeps it selectable
  // instead of silently swapping it for a canonical unit on open.
  const unitOptions =
    line && !isCanonicalPantryUnit(line.unit)
      ? [getPantryUnit(line.unit), ...PANTRY_UNITS]
      : PANTRY_UNITS;

  function handleOpenChange(open: boolean) {
    if (open && line) {
      setDisplayText(line.displayText);
      setQuantity(String(line.quantity));
      setUnit(line.unit);
    }
    onOpenChange(open);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (displayText.trim().length === 0) return;
    onSave({
      displayText: displayText.trim(),
      quantity: Number(quantity),
      unit,
    });
  }

  return (
    <DialogRoot open={line !== null} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-3">
          <Input
            autoFocus
            value={displayText}
            onChange={(e) => setDisplayText(e.target.value)}
          />
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-20"
            />
            <Select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="flex-1"
            >
              {unitOptions.map((u) => (
                <option key={u.key} value={u.key}>
                  {u.label}
                  {!isCanonicalPantryUnit(u.key) ? " (from Inventory)" : ""}
                </option>
              ))}
            </Select>
          </div>

          {stock ? (
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Linked to Inventory</p>
              <p className="mt-1">
                {stock.food.name} —{" "}
                {formatQuantityUnit(stock.quantity, stock.unit)} on hand in{" "}
                {getPantryLocation(stock.location).label.toLowerCase()}
              </p>
            </div>
          ) : (
            line && (
              <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                Not currently in your pantry.
              </p>
            )
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

function AddLineDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (input: {
    displayText: string;
    quantity: number;
    unit: string;
  }) => void;
}) {
  const [displayText, setDisplayText] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState(DEFAULT_PANTRY_UNIT_KEY);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (displayText.trim().length === 0) return;
    onAdd({ displayText, quantity: Number(quantity), unit });
    setDisplayText("");
    setQuantity("1");
    setUnit(DEFAULT_PANTRY_UNIT_KEY);
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
            <Select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="flex-1"
            >
              {PANTRY_UNITS.map((u) => (
                <option key={u.key} value={u.key}>
                  {u.label}
                </option>
              ))}
            </Select>
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
