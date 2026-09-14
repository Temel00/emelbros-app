"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #119 resolves.
 *
 * Variant F — "Stepper, per-group nudge": Variant B's grouped-by-location
 * shape, with quantity edited via a +/- stepper (name/unit still edit via a
 * tap-to-input, same as Variant D) and the pantry link tucked behind a
 * chevron — collapsed by default so the list stays scannable, expandable
 * per row when you want the stock number. The "you're short" nudge rides on
 * the first location group's heading rather than a global banner or badge.
 * Copy-as-CSV opens a dialog with a readable preview and its own copy
 * button, for anyone who wants to check the format before pasting it
 * somewhere.
 */

import { ChevronDown, Copy, Minus, Plus, Trash2 } from "lucide-react";
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
  findPantryStock,
  linesToCsv,
  type ShoppingLine,
} from "@/modules/nutrition/components/prototype-shopping-list-shared";

const NOT_IN_PANTRY_KEY = "__not_in_pantry__";

export function VariantF(props: ShoppingListVariantProps) {
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
  const [csvOpen, setCsvOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const groups = groupByLocationKey(lines);
  const diff =
    pendingLines !== null ? diffAutoLines(lines, pendingLines) : null;

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-20">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <h1 className="text-base font-semibold">Shopping list</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setCsvOpen(true)}>
            <Copy data-icon="inline-start" />
            Export
          </Button>
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

      {groups.map((group, groupIndex) => (
        <section key={group.key} className="flex flex-col gap-1.5">
          <h2 className="flex items-baseline gap-2 px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {group.label}
            {groupIndex === 0 && shortageHint && (
              <span className="text-[0.65rem] font-normal tracking-normal text-amber-700 normal-case dark:text-amber-400">
                — {shortageHint.text}
              </span>
            )}
          </h2>
          <ul className="flex flex-col gap-1">
            {group.items.map((line) => {
              const stock = findPantryStock(pantryItems, line.foodId);
              const isExpanded = expanded.has(line.id);
              return (
                <li
                  key={line.id}
                  className={`rounded-lg border border-border px-3 py-2.5 ${
                    line.checkedOff ? "bg-muted/30" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      className="mt-0.5 size-6"
                      checked={line.checkedOff}
                      onCheckedChange={() => toggleCheck(line.id)}
                    />
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="outline"
                        aria-label="Decrease quantity"
                        disabled={line.quantity <= 0}
                        onClick={() =>
                          updateLine(line.id, {
                            quantity: Math.max(0, line.quantity - 1),
                          })
                        }
                      >
                        <Minus />
                      </Button>
                      <span className="w-5 text-center text-sm tabular-nums">
                        {line.quantity}
                      </span>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="outline"
                        aria-label="Increase quantity"
                        onClick={() =>
                          updateLine(line.id, {
                            quantity: line.quantity + 1,
                          })
                        }
                      >
                        <Plus />
                      </Button>
                    </div>
                    <EditableText
                      value={line.displayText}
                      onCommit={(displayText) =>
                        updateLine(line.id, { displayText })
                      }
                      checkedOff={line.checkedOff}
                    />
                    {stock && (
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        aria-label={
                          isExpanded ? "Hide details" : "Show details"
                        }
                        onClick={() => toggleExpanded(line.id)}
                        className={isExpanded ? "rotate-180" : ""}
                      >
                        <ChevronDown />
                      </Button>
                    )}
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
                  </div>
                  {line.checkedOff && line.restockNote && (
                    <p className="mt-1 pl-9 text-xs text-muted-foreground">
                      ✓ {line.restockNote}
                    </p>
                  )}
                  {isExpanded && stock && (
                    <div className="mt-2 ml-9 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                      In your pantry: {stock.quantity} {stock.unit} (
                      {getPantryLocation(stock.location).label.toLowerCase()})
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <AddLineDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={addManualLine}
      />

      <CsvExportDialog open={csvOpen} onOpenChange={setCsvOpen} lines={lines} />

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

function EditableText({
  value,
  onCommit,
  checkedOff,
}: {
  value: string;
  onCommit: (value: string) => void;
  checkedOff: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft.trim().length > 0) onCommit(draft.trim());
          else setDraft(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="h-7 min-w-0 flex-1 py-1 text-sm"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={`min-w-0 flex-1 truncate rounded px-1 py-0.5 text-left text-sm hover:bg-muted ${
        checkedOff ? "text-muted-foreground line-through" : ""
      }`}
    >
      {value}
    </button>
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

function CsvExportDialog({
  open,
  onOpenChange,
  lines,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: ShoppingLine[];
}) {
  const [copied, setCopied] = useState(false);
  const csv = linesToCsv(lines);

  function copy() {
    navigator.clipboard.writeText(csv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export as CSV</DialogTitle>
        </DialogHeader>
        <textarea
          readOnly
          value={csv}
          rows={Math.min(lines.length + 2, 10)}
          className="mt-2 w-full resize-none rounded-lg border border-input bg-muted/30 p-2.5 font-mono text-xs"
        />
        <DialogFooter>
          <DialogClose className={buttonVariants({ variant: "ghost" })}>
            Close
          </DialogClose>
          <Button onClick={copy}>
            {copied ? "Copied!" : "Copy to clipboard"}
          </Button>
        </DialogFooter>
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
