"use client";

import { type FormEvent, useState, useTransition } from "react";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { resolveIcon } from "@/lib/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  UNIT_DIMENSIONS,
  DEFAULT_UNIT_KEY,
  DEFAULT_LOCATION_KEY,
  type UnitDimension,
} from "@/modules/nutrition/lib/defaults";
import type { UnitRow, PantryLocationRow } from "@/modules/nutrition/queries";
import {
  archivePantryLocationAction,
  archiveUnitAction,
  createPantryLocationAction,
  createUnitAction,
  deletePantryLocationAction,
  deleteUnitAction,
  renamePantryLocationAction,
  renameUnitAction,
  reorderPantryLocationsAction,
  reorderUnitsAction,
  restorePantryLocationAction,
  restoreUnitAction,
  setPantryLocationIconAction,
} from "@/modules/nutrition/actions";

/**
 * The nutrition settings surface (#157): two managed-list editors — units and
 * pantry locations — on one page. Every mutation rides an existing server
 * action (#156) and the list re-renders from the revalidated SSR fetch; the
 * only client state is per-row edit/error/pending UI. Guard errors thrown by
 * the actions (a protected default, a unit still in use, a duplicate name)
 * surface inline under the row that raised them, so the page never crashes.
 *
 * Reorder is up/down rather than drag-and-drop — it reads the same on touch as
 * on desktop, needs no pointer-sensor library, and mirrors the existing
 * `moveRecipeIngredientAction` pattern. Each nudge sends the whole reordered
 * key list to the reorder action, which rewrites `sort_order` contiguously.
 *
 * The immutable `key` is never editable (ADR-0017): renaming only touches the
 * display label. Protected defaults (`g`, `fridge`) can be renamed and
 * re-ordered but never archived or deleted — they are the fallback rows that
 * `ON DELETE SET DEFAULT` resets to.
 */

// A plain (non-component) helper so `resolveIcon`'s dynamic lookup doesn't read
// as a "component created during render" (react-hooks/static-components) — same
// pattern as `location-icon.tsx`'s `locationIcon`.
function iconEl(name: string, className: string) {
  const Icon = resolveIcon(name);
  return <Icon className={className} aria-hidden />;
}

/**
 * The curated Lucide set offered when picking a pantry-location icon (agreed
 * in the icon-vocabulary decision, #149). Stored as the icon name string on
 * the row; anything already stored still renders via `resolveIcon`.
 */
const ICON_OPTIONS = [
  "Refrigerator",
  "Snowflake",
  "Archive",
  "Package",
  "Box",
  "ShoppingBag",
  "Wine",
  "Coffee",
  "Apple",
  "Wheat",
  "Leaf",
  "Egg",
  "Milk",
  "Carrot",
  "Sandwich",
  "Warehouse",
  "Home",
  "Utensils",
  "ChefHat",
  "Store",
] as const;

const DEFAULT_NEW_LOCATION_ICON = "Package";

const DIMENSION_COLORS: Record<UnitDimension, string> = {
  weight: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  volume: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  count: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback;
}

function reorderKeys(keys: string[], index: number, direction: "up" | "down") {
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= keys.length) return null;
  const next = [...keys];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

// --- Icon picker -----------------------------------------------------------

function IconPickerDialog({
  open,
  current,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  current: string;
  onOpenChange: (open: boolean) => void;
  onSelect: (name: string) => void;
}) {
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pick an icon</DialogTitle>
        </DialogHeader>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {ICON_OPTIONS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onSelect(name)}
              aria-label={name}
              aria-pressed={name === current}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg border transition-colors",
                name === current
                  ? "border-ring bg-secondary text-secondary-foreground"
                  : "border-input hover:bg-muted",
              )}
            >
              {iconEl(name, "size-5")}
            </button>
          ))}
        </div>
      </DialogContent>
    </DialogRoot>
  );
}

// --- Shared row chrome ------------------------------------------------------

function ReorderControls({
  canMoveUp,
  canMoveDown,
  disabled,
  onMove,
}: {
  canMoveUp: boolean;
  canMoveDown: boolean;
  disabled: boolean;
  onMove: (direction: "up" | "down") => void;
}) {
  return (
    <div className="flex flex-col">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Move up"
        disabled={disabled || !canMoveUp}
        onClick={() => onMove("up")}
      >
        <ChevronUp />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Move down"
        disabled={disabled || !canMoveDown}
        onClick={() => onMove("down")}
      >
        <ChevronDown />
      </Button>
    </div>
  );
}

// --- Unit row ---------------------------------------------------------------

function UnitRowItem({
  unit,
  orderedKeys,
  index,
}: {
  unit: UnitRow;
  orderedKeys: string[];
  index: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(unit.label);
  const [error, setError] = useState<string | null>(null);

  const dimension = unit.dimension as UnitDimension;
  const archived = !unit.active;

  function run(action: () => Promise<void>, fallback: string) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (cause) {
        setError(errorMessage(cause, fallback));
      }
    });
  }

  function handleRename(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await renameUnitAction(unit.key, label);
        setEditing(false);
      } catch (cause) {
        setError(errorMessage(cause, "Couldn't rename that unit"));
      }
    });
  }

  function move(direction: "up" | "down") {
    const next = reorderKeys(orderedKeys, index, direction);
    if (!next) return;
    run(() => reorderUnitsAction(next), "Couldn't reorder");
  }

  return (
    <li
      className={cn(
        "flex flex-col gap-1 rounded-lg border border-border px-2 py-1.5",
        archived && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2">
        <ReorderControls
          canMoveUp={index > 0}
          canMoveDown={index < orderedKeys.length - 1}
          disabled={isPending}
          onMove={move}
        />

        {editing ? (
          <form
            onSubmit={handleRename}
            className="flex flex-1 items-center gap-1.5"
          >
            <Input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-8 flex-1"
              required
            />
            <Button type="submit" size="xs" disabled={isPending}>
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Cancel"
              onClick={() => {
                setLabel(unit.label);
                setEditing(false);
                setError(null);
              }}
            >
              <X />
            </Button>
          </form>
        ) : (
          <>
            <span className="flex-1 truncate text-sm font-medium">
              {unit.label}
            </span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-xs font-medium",
                DIMENSION_COLORS[dimension],
              )}
            >
              {dimension}
            </span>
            {unit.protected && (
              <span className="text-xs text-muted-foreground">base</span>
            )}
            {archived && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                archived
              </span>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Rename"
              disabled={isPending}
              onClick={() => setEditing(true)}
            >
              <Pencil />
            </Button>

            {archived ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={isPending}
                onClick={() =>
                  run(() => restoreUnitAction(unit.key), "Couldn't restore")
                }
              >
                <RotateCcw />
                Restore
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={isPending || unit.protected}
                onClick={() =>
                  run(() => archiveUnitAction(unit.key), "Couldn't archive")
                }
              >
                Archive
              </Button>
            )}

            {archived && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Delete"
                disabled={isPending || unit.protected}
                onClick={() =>
                  run(() => deleteUnitAction(unit.key), "Couldn't delete")
                }
              >
                <Trash2 />
              </Button>
            )}
          </>
        )}
      </div>

      {error && (
        <p className="pl-9 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}

// --- Location row -----------------------------------------------------------

function LocationRowItem({
  location,
  orderedKeys,
  index,
}: {
  location: PantryLocationRow;
  orderedKeys: string[];
  index: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [pickingIcon, setPickingIcon] = useState(false);
  const [label, setLabel] = useState(location.label);
  const [error, setError] = useState<string | null>(null);

  const archived = !location.active;

  function run(action: () => Promise<void>, fallback: string) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (cause) {
        setError(errorMessage(cause, fallback));
      }
    });
  }

  function handleRename(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await renamePantryLocationAction(location.key, label);
        setEditing(false);
      } catch (cause) {
        setError(errorMessage(cause, "Couldn't rename that location"));
      }
    });
  }

  function move(direction: "up" | "down") {
    const next = reorderKeys(orderedKeys, index, direction);
    if (!next) return;
    run(() => reorderPantryLocationsAction(next), "Couldn't reorder");
  }

  return (
    <li
      className={cn(
        "flex flex-col gap-1 rounded-lg border border-border px-2 py-1.5",
        archived && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2">
        <ReorderControls
          canMoveUp={index > 0}
          canMoveDown={index < orderedKeys.length - 1}
          disabled={isPending}
          onMove={move}
        />

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Change icon"
          disabled={isPending}
          onClick={() => setPickingIcon(true)}
        >
          {iconEl(location.icon, "size-4")}
        </Button>

        {editing ? (
          <form
            onSubmit={handleRename}
            className="flex flex-1 items-center gap-1.5"
          >
            <Input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-8 flex-1"
              required
            />
            <Button type="submit" size="xs" disabled={isPending}>
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Cancel"
              onClick={() => {
                setLabel(location.label);
                setEditing(false);
                setError(null);
              }}
            >
              <X />
            </Button>
          </form>
        ) : (
          <>
            <span className="flex-1 truncate text-sm font-medium">
              {location.label}
            </span>
            {location.protected && (
              <span className="text-xs text-muted-foreground">default</span>
            )}
            {archived && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                archived
              </span>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Rename"
              disabled={isPending}
              onClick={() => setEditing(true)}
            >
              <Pencil />
            </Button>

            {archived ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={isPending}
                onClick={() =>
                  run(
                    () => restorePantryLocationAction(location.key),
                    "Couldn't restore",
                  )
                }
              >
                <RotateCcw />
                Restore
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={isPending || location.protected}
                onClick={() =>
                  run(
                    () => archivePantryLocationAction(location.key),
                    "Couldn't archive",
                  )
                }
              >
                Archive
              </Button>
            )}

            {archived && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Delete"
                disabled={isPending || location.protected}
                onClick={() =>
                  run(
                    () => deletePantryLocationAction(location.key),
                    "Couldn't delete",
                  )
                }
              >
                <Trash2 />
              </Button>
            )}
          </>
        )}
      </div>

      {error && (
        <p className="pl-9 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      <IconPickerDialog
        open={pickingIcon}
        current={location.icon}
        onOpenChange={setPickingIcon}
        onSelect={(name) => {
          setPickingIcon(false);
          run(
            () => setPantryLocationIconAction(location.key, name),
            "Couldn't change the icon",
          );
        }}
      />
    </li>
  );
}

// --- Add rows ---------------------------------------------------------------

function AddUnitRow() {
  const [isPending, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [dimension, setDimension] = useState<UnitDimension>("weight");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createUnitAction({ label, dimension });
        setLabel("");
        setDimension("weight");
      } catch (cause) {
        setError(errorMessage(cause, "Couldn't add that unit"));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Add a unit…"
          className="h-8 flex-1"
          required
        />
        <Select
          value={dimension}
          onChange={(e) => setDimension(e.target.value as UnitDimension)}
          className="w-28"
          aria-label="Dimension"
        >
          {UNIT_DIMENSIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
        <Button type="submit" size="sm" disabled={isPending}>
          Add
        </Button>
      </div>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function AddLocationRow() {
  const [isPending, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState(DEFAULT_NEW_LOCATION_ICON);
  const [pickingIcon, setPickingIcon] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createPantryLocationAction({ label, icon });
        setLabel("");
        setIcon(DEFAULT_NEW_LOCATION_ICON);
      } catch (cause) {
        setError(errorMessage(cause, "Couldn't add that location"));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Pick icon"
          onClick={() => setPickingIcon(true)}
        >
          {iconEl(icon, "size-4")}
        </Button>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Add a location…"
          className="h-8 flex-1"
          required
        />
        <Button type="submit" size="sm" disabled={isPending}>
          Add
        </Button>
      </div>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      <IconPickerDialog
        open={pickingIcon}
        current={icon}
        onOpenChange={setPickingIcon}
        onSelect={(name) => {
          setIcon(name);
          setPickingIcon(false);
        }}
      />
    </form>
  );
}

// --- Page body --------------------------------------------------------------

export function PantryFieldSettings({
  units,
  locations,
}: {
  units: UnitRow[];
  locations: PantryLocationRow[];
}) {
  const unitKeys = units.map((unit) => unit.key);
  const locationKeys = locations.map((location) => location.key);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Units</h2>
          <p className="text-sm text-muted-foreground">
            Measures foods are counted in, grouped by dimension. The base unit{" "}
            <code className="text-xs">{DEFAULT_UNIT_KEY}</code> is the fallback
            and can&apos;t be archived or removed.
          </p>
        </div>
        <ul className="flex flex-col gap-1.5">
          {units.map((unit, index) => (
            <UnitRowItem
              key={unit.key}
              unit={unit}
              orderedKeys={unitKeys}
              index={index}
            />
          ))}
        </ul>
        <AddUnitRow />
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Pantry locations</h2>
          <p className="text-sm text-muted-foreground">
            Where the household keeps things. The default location{" "}
            <code className="text-xs">{DEFAULT_LOCATION_KEY}</code> is the
            fallback and can&apos;t be archived or removed.
          </p>
        </div>
        <ul className="flex flex-col gap-1.5">
          {locations.map((location, index) => (
            <LocationRowItem
              key={location.key}
              location={location}
              orderedKeys={locationKeys}
              index={index}
            />
          ))}
        </ul>
        <AddLocationRow />
      </section>
    </div>
  );
}
