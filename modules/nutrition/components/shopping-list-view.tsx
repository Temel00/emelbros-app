"use client";

import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState, useTransition } from "react";

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
import {
  addManualShoppingListItemAction,
  checkOffShoppingListItemAction,
  deleteShoppingListItemAction,
  generateShoppingListAction,
  previewShoppingListGenerationAction,
  updateManualShoppingListItemAction,
} from "@/modules/nutrition/actions";
import { locationIcon } from "@/modules/nutrition/components/location-icon";
import { getPantryLocation } from "@/modules/nutrition/lib/locations";
import type { ShoppingListShortfall } from "@/modules/nutrition/lib/shopping-list-generation";
import {
  type AutoLineDiff,
  diffAutoLines,
  formatQuantity,
  groupShoppingListItems,
  isEmptyDiff,
  shoppingListToCsv,
} from "@/modules/nutrition/lib/shopping-list-view";
import type {
  PantryItemWithFood,
  ShoppingListItemRow,
} from "@/modules/nutrition/queries";

/**
 * The shopping list (nutrition.md §3.4, wayfinder #120), translating the
 * settled prototype (#119, Variant E) onto the real schema: lines grouped by
 * the location of the pantry row their food is stocked in, falling back to a
 * "Not in your pantry" bucket for freeform or unlinked lines. Units are
 * plain freeform text (no canonical list — that's #135's scope), matching
 * `pantry-item-row.tsx`'s own inline-edit inputs.
 */
export function ShoppingListView({
  items,
  pantryItems,
  range,
}: {
  items: ShoppingListItemRow[];
  pantryItems: PantryItemWithFood[];
  range: { start: string; end: string };
}) {
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<ShoppingListItemRow | null>(null);
  const [pendingLines, setPendingLines] = useState<
    ShoppingListShortfall[] | null
  >(null);
  const [copied, setCopied] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const { grouped, notInPantry } = groupShoppingListItems(items, pantryItems);

  const diff =
    pendingLines !== null ? diffAutoLines(items, pendingLines) : null;

  function toggleCheck(item: ShoppingListItemRow) {
    if (item.checked_off) return;
    startTransition(async () => {
      await checkOffShoppingListItemAction(item.id);
    });
  }

  function removeManual(item: ShoppingListItemRow) {
    if (!confirm(`Remove ${item.display_text} from the list?`)) return;
    startTransition(async () => {
      await deleteShoppingListItemAction(item.id);
    });
  }

  function copyCsv() {
    navigator.clipboard.writeText(shoppingListToCsv(items)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  function startGenerate() {
    setGenerateError(null);
    startTransition(async () => {
      try {
        const preview = await previewShoppingListGenerationAction(
          range.start,
          range.end,
        );
        setPendingLines(preview);
      } catch (cause) {
        setGenerateError(
          cause instanceof Error ? cause.message : "Couldn't preview the plan",
        );
      }
    });
  }

  function confirmGenerate() {
    startTransition(async () => {
      await generateShoppingListAction(range.start, range.end);
      setPendingLines(null);
    });
  }

  function cancelGenerate() {
    setPendingLines(null);
  }

  return (
    <div className="relative flex flex-col gap-4 pb-4">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-end gap-2 border-b border-border bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Copy as CSV"
          onClick={copyCsv}
        >
          <Copy />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setAddOpen(true)}
        >
          <Plus data-icon="inline-start" />
          Add
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={startGenerate}
          disabled={isPending}
        >
          Generate
        </Button>
      </div>

      {copied && (
        <div className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-lg">
          Copied {items.length} items as CSV
        </div>
      )}

      {items.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nothing on the list yet — Generate to pull shortfalls from this
          week&apos;s plan, or add an item.
        </p>
      )}

      {grouped.map((group) => (
        <section key={group.location.key} className="flex flex-col gap-1.5">
          <h2 className="flex items-center gap-2 px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {locationIcon(group.location, "size-3.5")}
            {group.location.label}
          </h2>
          <ul className="flex flex-col gap-1">
            {group.items.map((item) => (
              <ShoppingListRow
                key={item.id}
                item={item}
                onToggle={() => toggleCheck(item)}
                onEdit={() => setEditItem(item)}
                onRemove={() => removeManual(item)}
              />
            ))}
          </ul>
        </section>
      ))}

      {notInPantry.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h2 className="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Not in your pantry
          </h2>
          <ul className="flex flex-col gap-1">
            {notInPantry.map((item) => (
              <ShoppingListRow
                key={item.id}
                item={item}
                onToggle={() => toggleCheck(item)}
                onEdit={() => setEditItem(item)}
                onRemove={() => removeManual(item)}
              />
            ))}
          </ul>
        </section>
      )}

      <AddItemDialog open={addOpen} onOpenChange={setAddOpen} />

      <EditItemDialog
        item={editItem}
        pantryItems={pantryItems}
        onOpenChange={(open) => {
          if (!open) setEditItem(null);
        }}
      />

      <GenerateDialog
        pendingLines={pendingLines}
        diff={diff}
        error={generateError}
        onCancel={cancelGenerate}
        onConfirm={confirmGenerate}
      />
    </div>
  );
}

function ShoppingListRow({
  item,
  onToggle,
  onEdit,
  onRemove,
}: {
  item: ShoppingListItemRow;
  onToggle: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <li
      className={`flex items-start gap-3 rounded-lg border border-border px-3 py-2.5 ${
        item.checked_off ? "bg-muted/30" : ""
      }`}
    >
      <Checkbox
        className="mt-0.5 size-6"
        checked={item.checked_off}
        disabled={item.checked_off}
        onCheckedChange={onToggle}
        aria-label={`Check off ${item.display_text}`}
      />
      <button
        type="button"
        onClick={onEdit}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex items-center gap-2">
          <p
            className={`truncate text-sm ${
              item.checked_off ? "text-muted-foreground line-through" : ""
            }`}
          >
            {formatQuantity(item.quantity, item.unit)} {item.display_text}
          </p>
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[0.65rem] font-medium ${
              item.source === "auto"
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {item.source === "auto" ? "plan" : "you"}
          </span>
        </div>
      </button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label="Edit"
        onClick={onEdit}
      >
        <Pencil />
      </Button>
      {item.source === "manual" && (
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Remove"
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      )}
    </li>
  );
}

function AddItemDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [displayText, setDisplayText] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setDisplayText("");
    setQuantity("");
    setUnit("");
    setError(null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await addManualShoppingListItemAction({
          displayText,
          quantity: quantity.trim() === "" ? null : Number(quantity),
          unit: unit.trim() === "" ? null : unit,
        });
        reset();
        onOpenChange(false);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Couldn't add that");
      }
    });
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
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
            required
          />
          <div className="flex gap-2">
            <Input
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Qty"
              className="w-20"
            />
            <Input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Unit"
              className="flex-1"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <DialogClose className={buttonVariants({ variant: "ghost" })}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}

function EditItemDialog({
  item,
  pantryItems,
  onOpenChange,
}: {
  item: ShoppingListItemRow | null;
  pantryItems: PantryItemWithFood[];
  onOpenChange: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [displayText, setDisplayText] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [error, setError] = useState<string | null>(null);

  const stock = item?.food_id
    ? (pantryItems.find((p) => p.food_id === item.food_id) ?? null)
    : null;

  function handleOpenChange(open: boolean) {
    if (open && item) {
      setDisplayText(item.display_text);
      setQuantity(item.quantity === null ? "" : String(item.quantity));
      setUnit(item.unit ?? "");
      setError(null);
    }
    onOpenChange(open);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!item) return;
    setError(null);

    startTransition(async () => {
      try {
        await updateManualShoppingListItemAction(item.id, {
          foodId: item.food_id,
          displayText,
          quantity: quantity.trim() === "" ? null : Number(quantity),
          unit: unit.trim() === "" ? null : unit,
        });
        onOpenChange(false);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Couldn't save that");
      }
    });
  }

  return (
    <DialogRoot open={item !== null} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-3">
          <Input
            autoFocus
            value={displayText}
            onChange={(e) => setDisplayText(e.target.value)}
            required
          />
          <div className="flex gap-2">
            <Input
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Qty"
              className="w-20"
            />
            <Input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Unit"
              className="flex-1"
            />
          </div>

          {stock ? (
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Linked to Inventory</p>
              <p className="mt-1">
                {stock.food.name} — {formatQuantity(stock.quantity, stock.unit)}{" "}
                on hand in{" "}
                {getPantryLocation(stock.location).label.toLowerCase()}
              </p>
            </div>
          ) : (
            item?.food_id && (
              <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                Not currently in your pantry.
              </p>
            )
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <DialogClose className={buttonVariants({ variant: "ghost" })}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}

function GenerateDialog({
  pendingLines,
  diff,
  error,
  onCancel,
  onConfirm,
}: {
  pendingLines: ShoppingListShortfall[] | null;
  diff: AutoLineDiff | null;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <DialogRoot
      open={pendingLines !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate shopping list</DialogTitle>
        </DialogHeader>

        {error && (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {pendingLines && diff && (
          <div className="mt-2 text-sm">
            {isEmptyDiff(diff) ? (
              <p className="rounded-lg bg-muted/50 p-3 text-muted-foreground">
                Nothing missing — your pantry already covers this week&apos;s
                plan.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {diff.added.map((line) => (
                  <li
                    key={`added:${line.foodId}:${line.unit}`}
                    className="text-green-700 dark:text-green-400"
                  >
                    + {formatQuantity(line.quantity, line.unit)}{" "}
                    {line.displayText}
                  </li>
                ))}
                {diff.changed.map(({ previous, next }) => (
                  <li
                    key={`changed:${next.foodId}:${next.unit}`}
                    className="text-amber-700 dark:text-amber-400"
                  >
                    ~ {next.displayText}:{" "}
                    {formatQuantity(previous.quantity, previous.unit)} →{" "}
                    {formatQuantity(next.quantity, next.unit)}
                  </li>
                ))}
                {diff.removed.map((item) => (
                  <li
                    key={`removed:${item.id}`}
                    className="text-muted-foreground line-through"
                  >
                    − {formatQuantity(item.quantity, item.unit)}{" "}
                    {item.display_text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <DialogFooter>
          <DialogClose
            onClick={onCancel}
            className={buttonVariants({ variant: "ghost" })}
          >
            Cancel
          </DialogClose>
          <Button onClick={onConfirm}>Replace auto lines</Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
