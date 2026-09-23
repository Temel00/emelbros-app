"use client";

import {
  AlertTriangle,
  Copy,
  Link2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  addManualShoppingListItemAction,
  checkOffShoppingListItemAction,
  deleteShoppingListItemAction,
  generateShoppingListAction,
  previewShoppingListGenerationAction,
  updateManualShoppingListItemAction,
} from "@/modules/nutrition/actions";
import { FoodLinkPicker } from "@/modules/nutrition/components/food-link-picker";
import { locationIcon } from "@/modules/nutrition/components/location-icon";
import { RoundedSelect } from "@/modules/nutrition/components/rounded-select";
import { SpinnerInput } from "@/modules/nutrition/components/spinner-input";
import { DEFAULT_UNIT_KEY } from "@/modules/nutrition/lib/defaults";
import type { ShoppingListShortfall } from "@/modules/nutrition/lib/shopping-list-generation";
import {
  type AutoLineDiff,
  diffAutoLines,
  formatQuantity,
  groupShoppingListItems,
  isEmptyDiff,
  scopeUnitsByDimension,
  shoppingListToCsv,
} from "@/modules/nutrition/lib/shopping-list-view";
import type {
  FoodRow,
  PantryItemWithFood,
  PantryLocationRow,
  ShoppingListItemRow,
  UnitRow,
} from "@/modules/nutrition/queries";

/**
 * The shopping list (nutrition.md §3.4, wayfinder #120), translating the
 * settled prototype (#119, Variant E) onto the real schema: lines grouped by
 * the location of the pantry row their food is stocked in, falling back to a
 * "Not in your pantry" bucket for freeform or unlinked lines. Adding a line
 * is a segmented two-path modal (#160, Variant C): the food path leads with
 * the same searchable `FoodLinkPicker` recipe ingredients use (#159), the
 * freeform path is a plain display-text line. Units are the managed
 * vocabulary (ADR-0017) via a constrained `<select>` in both paths and both
 * the Add and Edit dialogs — the `unit` column is FK'd to `nutrition_unit`,
 * so no freeform unit string can reach it; a chosen unit that differs from a
 * linked food's base unit is accepted and flagged, never converted
 * (ADR-0016).
 */
export function ShoppingListView({
  items,
  pantryItems,
  locations,
  foods,
  units,
  range,
}: {
  items: ShoppingListItemRow[];
  pantryItems: PantryItemWithFood[];
  locations: PantryLocationRow[];
  foods: FoodRow[];
  units: UnitRow[];
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

  const { grouped, notInPantry } = groupShoppingListItems(
    items,
    pantryItems,
    locations,
  );

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

      <AddItemDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        foods={foods}
        units={units}
      />

      <EditItemDialog
        item={editItem}
        pantryItems={pantryItems}
        locations={locations}
        units={units}
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

type AddPath = "food" | "freeform";

/**
 * Variant C (#160): a segmented two-path Add modal. The food path leads with
 * `FoodLinkPicker` — picking a food sets `food_id` and defaults the unit
 * select to that food's own base unit, scoped so the select surfaces units
 * of the same dimension first (ADR-0016); a mismatched unit is accepted and
 * flagged, never converted. The freeform path is a plain display-text line
 * with `food_id` left null, matching the list's pre-existing manual lines.
 * Both paths' unit is the constrained managed `<select>` (ADR-0017) — never
 * freeform text — and may be left blank.
 */
function AddItemDialog({
  open,
  onOpenChange,
  foods,
  units,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  foods: FoodRow[];
  units: UnitRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const [path, setPath] = useState<AddPath>("food");
  const [pickedFood, setPickedFood] = useState<FoodRow | null>(null);
  const [displayText, setDisplayText] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState(DEFAULT_UNIT_KEY);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setPath("food");
    setPickedFood(null);
    setDisplayText("");
    setQuantity("");
    setUnit(DEFAULT_UNIT_KEY);
    setError(null);
  }

  function switchPath(next: AddPath) {
    setPath(next);
    setPickedFood(null);
    setDisplayText("");
    setQuantity("");
    setUnit(DEFAULT_UNIT_KEY);
    setError(null);
  }

  function pickFood(food: FoodRow) {
    setPickedFood(food);
    setUnit(food.unit || DEFAULT_UNIT_KEY);
  }

  const foodDimension = pickedFood
    ? (units.find((u) => u.key === pickedFood.unit)?.dimension ?? null)
    : null;
  const scopedUnits =
    path === "food" ? scopeUnitsByDimension(units, foodDimension) : units;
  const unitMismatch =
    path === "food" &&
    pickedFood !== null &&
    unit !== "" &&
    unit !== pickedFood.unit;

  const canSubmit =
    path === "food" ? pickedFood !== null : displayText.trim() !== "";

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!canSubmit) return;

    const foodId = path === "food" ? (pickedFood?.id ?? null) : null;
    const text =
      path === "food" ? (pickedFood?.name ?? "") : displayText.trim();

    startTransition(async () => {
      try {
        await addManualShoppingListItemAction({
          foodId,
          displayText: text,
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
        <div className="mt-2 flex gap-1 rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => switchPath("food")}
            aria-pressed={path === "food"}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              path === "food"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Add a food
          </button>
          <button
            type="button"
            onClick={() => switchPath("freeform")}
            aria-pressed={path === "freeform"}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              path === "freeform"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Freeform
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
          {path === "food" ? (
            pickedFood === null ? (
              <FoodLinkPicker
                foods={foods}
                units={units}
                onPick={pickFood}
                emptyHint="Type to search the food dictionary, or switch to Freeform for a plain reminder."
              />
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setPickedFood(null)}
                  className="inline-flex w-fit items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                  aria-label={`Unlink ${pickedFood.name}`}
                >
                  <Link2 className="size-3" /> {pickedFood.name}
                  <X className="size-3" />
                </button>
                <div className="flex gap-2">
                  <SpinnerInput
                    value={quantity}
                    onChange={setQuantity}
                    aria-label="Quantity"
                    className="w-28"
                  />
                  <UnitSelect
                    units={scopedUnits}
                    value={unit}
                    aria-label="Unit"
                    className="flex-1"
                    onChange={setUnit}
                  />
                </div>
                {unitMismatch && (
                  <p className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
                    <AlertTriangle className="size-3 shrink-0" aria-hidden />
                    Differs from {pickedFood.name}&apos;s base unit (
                    {pickedFood.unit}) — not converted, so this line won&apos;t
                    count toward macros.
                  </p>
                )}
              </div>
            )
          ) : (
            <div className="flex flex-col gap-2">
              <Input
                autoFocus
                value={displayText}
                onChange={(e) => setDisplayText(e.target.value)}
                placeholder="e.g. Paper towels"
                required
              />
              <div className="flex gap-2">
                <SpinnerInput
                  value={quantity}
                  onChange={setQuantity}
                  aria-label="Quantity"
                  className="w-28"
                />
                <UnitSelect
                  units={units}
                  value={unit}
                  aria-label="Unit"
                  className="flex-1"
                  onChange={setUnit}
                />
              </div>
            </div>
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
            <Button type="submit" disabled={isPending || !canSubmit}>
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}

/**
 * A constrained unit picker over the active managed vocabulary (ADR-0017),
 * mirroring recipe-ingredients-editor.tsx's unit picker (#159, #170), plus a
 * leading "No unit" option since the shopping list's `unit` column is
 * nullable — a line can be added or edited with no unit at all (e.g. "3
 * Eggs"). The current `value` is always kept selectable even when it isn't
 * in the active list (an archived unit still referenced by an existing
 * line), rather than silently snapping away from it. Renders the Variant D
 * `RoundedSelect` (#173) with the managed keys as `{ value, label }` pairs,
 * so the stored key (`fl_oz`) never leaks in place of its label (`fl oz`).
 */
function UnitSelect({
  units,
  value,
  onChange,
  className,
  disabled,
  "aria-label": ariaLabel,
}: {
  units: UnitRow[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const known = new Map(units.map((unit) => [unit.key, unit.label]));
  if (value !== "" && !known.has(value)) known.set(value, value);
  const options = [
    { value: "", label: "No unit" },
    ...[...known.entries()].map(([key, label]) => ({ value: key, label })),
  ];
  return (
    <RoundedSelect
      value={value}
      onChange={onChange}
      options={options}
      placeholder="No unit"
      className={className}
      disabled={disabled}
      aria-label={ariaLabel}
    />
  );
}

function EditItemDialog({
  item,
  pantryItems,
  locations,
  units,
  onOpenChange,
}: {
  item: ShoppingListItemRow | null;
  pantryItems: PantryItemWithFood[];
  locations: PantryLocationRow[];
  units: UnitRow[];
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
            <SpinnerInput
              value={quantity}
              onChange={setQuantity}
              aria-label="Quantity"
              className="w-20"
            />
            <UnitSelect
              units={units}
              value={unit}
              aria-label="Unit"
              className="flex-1"
              onChange={setUnit}
            />
          </div>

          {stock ? (
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Linked to Inventory</p>
              <p className="mt-1">
                {stock.food.name} — {formatQuantity(stock.quantity, stock.unit)}{" "}
                on hand in{" "}
                {(
                  locations.find((loc) => loc.key === stock.location)?.label ??
                  stock.location
                ).toLowerCase()}
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
