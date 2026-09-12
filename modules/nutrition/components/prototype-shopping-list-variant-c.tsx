"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #119 resolves.
 *
 * Variant C — "Spreadsheet, one table": every line, one `<table>`, in the
 * recipe-box design language (zebra striping, icon-slot cells). Auto vs
 * manual is an affordance distinction, not a visual one — a literal
 * "Source" column, and only manual rows get a remove control since auto
 * rows are read-only until the next Generate. Checked rows get strikethrough
 * and sink to one global "done" zone at the very bottom of the table,
 * regardless of source or location. Generate lives in a compact header
 * toolbar and opens a confirmation dialog with the diff. Restock is a
 * muted-until-checked icon column rather than prose.
 */

import { PackageCheck, Plus, Trash2 } from "lucide-react";
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
import { diffAutoLines } from "@/modules/nutrition/components/prototype-shopping-list-shared";

export function VariantC(props: ShoppingListVariantProps) {
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

  const sorted = [...lines].sort(
    (a, b) => Number(a.checkedOff) - Number(b.checkedOff),
  );
  const diff =
    pendingLines !== null ? diffAutoLines(lines, pendingLines) : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold">Shopping list</h1>
        <Button size="sm" variant="outline" onClick={startGenerate}>
          Generate
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="w-10 p-2" />
              <th className="p-2 text-left font-medium">Item</th>
              <th className="p-2 text-left font-medium">Qty</th>
              <th className="p-2 text-left font-medium">Source</th>
              <th className="p-2 text-left font-medium">Location</th>
              <th className="w-10 p-2" />
              <th className="w-10 p-2" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((line, i) => (
              <tr
                key={line.id}
                className={
                  line.checkedOff
                    ? "bg-muted/20 text-muted-foreground"
                    : i % 2 === 1
                      ? "bg-muted/20"
                      : ""
                }
              >
                <td className="p-2">
                  <Checkbox
                    className="size-5"
                    checked={line.checkedOff}
                    onCheckedChange={() => toggleCheck(line.id)}
                  />
                </td>
                <td
                  className={`p-2 ${line.checkedOff ? "line-through" : ""}`}
                >
                  {line.displayText}
                </td>
                <td className="p-2 tabular-nums">
                  {line.quantity} {line.unit}
                </td>
                <td className="p-2">
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[0.65rem] font-medium ${
                      line.source === "auto"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {line.source === "auto" ? "Plan" : "Manual"}
                  </span>
                </td>
                <td className="p-2 text-muted-foreground">
                  {line.location
                    ? getPantryLocation(line.location).label
                    : "—"}
                </td>
                <td className="p-2">
                  {line.checkedOff && line.restockNote && (
                    <span
                      title={line.restockNote}
                      className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground"
                    >
                      <PackageCheck className="size-4" />
                    </span>
                  )}
                </td>
                <td className="p-2">
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
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="p-6 text-center text-muted-foreground"
                >
                  Nothing on the list yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddRowForm onAdd={addManualLine} />

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
                  Confirming will clear the plan rows below.
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
            <Button onClick={confirmGenerate}>Replace plan rows</Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </div>
  );
}

function AddRowForm({
  onAdd,
}: {
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
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-lg border border-dashed border-border p-2"
    >
      <Input
        value={displayText}
        onChange={(e) => setDisplayText(e.target.value)}
        placeholder="Add a row…"
        className="flex-1"
      />
      <Input
        type="number"
        min="1"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        className="w-16"
      />
      <Input
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        className="w-20"
      />
      <Button type="submit" size="sm" variant="outline">
        <Plus data-icon="inline-start" />
        Add row
      </Button>
    </form>
  );
}
