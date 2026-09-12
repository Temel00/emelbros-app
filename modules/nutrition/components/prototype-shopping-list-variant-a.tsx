"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #119 resolves.
 *
 * Variant A — "Two lists, stacked": auto and manual lines get their own
 * section, structurally separated rather than just styled differently.
 * Generate lives as a banner atop the auto section with an inline (not
 * modal) preview — Confirm/Cancel sit right where the change will land.
 * Checked lines fade and sink to the bottom of their own section, not
 * removed, so a shopper can still see what's done without losing place.
 */

import { Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { ShoppingListVariantProps } from "@/modules/nutrition/components/prototype-shopping-list-harness";
import { diffAutoLines } from "@/modules/nutrition/components/prototype-shopping-list-shared";

export function VariantA(props: ShoppingListVariantProps) {
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

  const auto = sortChecked(lines.filter((l) => l.source === "auto"));
  const manual = sortChecked(lines.filter((l) => l.source === "manual"));

  const diff =
    pendingLines !== null ? diffAutoLines(lines, pendingLines) : null;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            From your plan
          </h2>
          <Button size="sm" variant="outline" onClick={startGenerate}>
            Generate
          </Button>
        </div>

        {pendingScenario && diff && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <p className="font-medium">
              {scenarioLabel(pendingScenario)}
            </p>
            {pendingLines && pendingLines.length === 0 ? (
              <p className="mt-1 text-muted-foreground">
                Nothing missing — your pantry covers the plan. Generating
                won&apos;t add anything.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1">
                {diff.added.map((l) => (
                  <li key={l.id} className="text-green-700 dark:text-green-400">
                    + {l.quantity} {l.unit} {l.displayText}
                  </li>
                ))}
                {diff.changed.map(({ previous, next }) => (
                  <li key={next.id} className="text-amber-700 dark:text-amber-400">
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
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={cancelGenerate}>
                Cancel
              </Button>
              <Button size="sm" onClick={confirmGenerate}>
                Replace auto lines
              </Button>
            </div>
          </div>
        )}

        {auto.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            No auto lines yet — tap Generate to pull shortfalls from this
            week&apos;s plan.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {auto.map((line) => (
              <li
                key={line.id}
                className={`flex items-center gap-3 rounded-lg border border-border px-3 py-3 transition-opacity ${
                  line.checkedOff ? "opacity-50" : ""
                }`}
              >
                <Checkbox
                  className="size-6"
                  checked={line.checkedOff}
                  onCheckedChange={() => toggleCheck(line.id)}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm ${line.checkedOff ? "line-through" : ""}`}
                  >
                    {line.quantity} {line.unit} {line.displayText}
                  </p>
                  {line.restockNote && (
                    <p className="text-xs text-muted-foreground">
                      {line.restockNote}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Added by you
        </h2>

        <ul className="flex flex-col gap-1">
          {manual.map((line) => (
            <li
              key={line.id}
              className={`flex items-center gap-3 rounded-lg border border-border px-3 py-3 transition-opacity ${
                line.checkedOff ? "opacity-50" : ""
              }`}
            >
              <Checkbox
                className="size-6"
                checked={line.checkedOff}
                onCheckedChange={() => toggleCheck(line.id)}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm ${line.checkedOff ? "line-through" : ""}`}
                >
                  {line.quantity} {line.unit} {line.displayText}
                </p>
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Remove"
                onClick={() => removeManualLine(line.id)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>

        <AddManualLineForm onAdd={addManualLine} />
      </section>

      {lines.length === 0 && (
        <p className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
          <ShoppingBasket className="size-8" />
          Nothing on the list yet.
        </p>
      )}
    </div>
  );
}

function sortChecked<T extends { checkedOff: boolean }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => Number(a.checkedOff) - Number(b.checkedOff),
  );
}

function AddManualLineForm({
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
    <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-1">
      <Input
        value={displayText}
        onChange={(e) => setDisplayText(e.target.value)}
        placeholder="Add an item…"
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
      <Button type="submit" size="icon-sm" aria-label="Add">
        <Plus />
      </Button>
    </form>
  );
}
