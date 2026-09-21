"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  deletePantryItemAction,
  updatePantryItemAction,
} from "@/modules/nutrition/actions";
import type {
  PantryItemWithFood,
  PantryLocationRow,
  UnitRow,
} from "@/modules/nutrition/queries";

/** `2 kg` / `1.5 each` — trailing zeros trimmed, since quantities are numeric. */
function formatQuantity(quantity: number, unit: string) {
  return `${Number(quantity)} ${unit}`;
}

/**
 * One pantry line (docs/modules/nutrition.md §3.2). Every member may edit
 * or delete any line — the kitchen is unowned (§2, §10) — so there is no
 * owner check here and no owner-only affordance.
 */
export function PantryItemRow({
  item,
  units,
  locations,
}: {
  item: PantryItemWithFood;
  units: UnitRow[];
  locations: PantryLocationRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(String(item.quantity));
  const [unit, setUnit] = useState(item.unit);
  const [location, setLocation] = useState(item.location);
  const [expiresOn, setExpiresOn] = useState(item.expires_on ?? "");

  // Render the managed label for the stored unit key, falling back to the key
  // itself if that unit has since been archived (a stored value never blanks).
  const unitLabel = units.find((u) => u.key === item.unit)?.label ?? item.unit;

  function save() {
    setError(null);

    startTransition(async () => {
      try {
        await updatePantryItemAction(item.id, {
          quantity: Number(quantity),
          unit,
          location,
          expiresOn: expiresOn === "" ? null : expiresOn,
        });
        setEditing(false);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Couldn't save that");
      }
    });
  }

  function remove() {
    if (!confirm(`Remove ${item.food.name} from the pantry?`)) return;

    startTransition(async () => {
      await deletePantryItemAction(item.id);
    });
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {item.food.name}
            {item.food.brand && (
              <span className="font-normal text-muted-foreground">
                {" "}
                · {item.food.brand}
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatQuantity(item.quantity, unitLabel)}
            {item.expires_on && ` · expires ${item.expires_on}`}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={editing ? "Close edit" : "Edit"}
            aria-pressed={editing}
            onClick={() => setEditing((prev) => !prev)}
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Delete"
            disabled={isPending}
            onClick={remove}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      {editing && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <Input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            className="w-24"
            aria-label={`Quantity of ${item.food.name}`}
          />
          <Select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-24"
            aria-label={`Unit for ${item.food.name}`}
          >
            {units.map((u) => (
              <option key={u.key} value={u.key}>
                {u.label}
              </option>
            ))}
            {/* A stored unit no longer active still round-trips (§10). */}
            {!units.some((u) => u.key === unit) && (
              <option value={unit}>{unit}</option>
            )}
          </Select>
          <Select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-auto"
            aria-label={`Location of ${item.food.name}`}
          >
            {locations.map((loc) => (
              <option key={loc.key} value={loc.key}>
                {loc.label}
              </option>
            ))}
            {/* A stored key no longer active still round-trips (§10). */}
            {!locations.some((loc) => loc.key === location) && (
              <option value={location}>{location}</option>
            )}
          </Select>
          <Input
            type="date"
            value={expiresOn}
            onChange={(e) => setExpiresOn(e.target.value)}
            className="w-auto"
            aria-label={`Expiry date for ${item.food.name}`}
          />
          <Button type="submit" size="sm" disabled={isPending}>
            Save
          </Button>
        </form>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}
