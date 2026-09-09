"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  deletePantryItemAction,
  updatePantryItemAction,
} from "@/modules/nutrition/actions";
import { pantryLocations } from "@/modules/nutrition/lib/locations";
import type { PantryItemWithFood } from "@/modules/nutrition/queries";

const FIELD = "h-8 rounded-lg border border-border bg-background px-2 text-sm";

/** `2 kg` / `1.5 each` — trailing zeros trimmed, since quantities are numeric. */
function formatQuantity(quantity: number, unit: string) {
  return `${Number(quantity)} ${unit}`;
}

/**
 * One pantry line (docs/modules/nutrition.md §3.2). Every member may edit
 * or delete any line — the kitchen is unowned (§2, §10) — so there is no
 * owner check here and no owner-only affordance.
 */
export function PantryItemRow({ item }: { item: PantryItemWithFood }) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(String(item.quantity));
  const [unit, setUnit] = useState(item.unit);
  const [location, setLocation] = useState(item.location);
  const [expiresOn, setExpiresOn] = useState(item.expires_on ?? "");

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
            {formatQuantity(item.quantity, item.unit)}
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
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            className={`${FIELD} w-24`}
            aria-label={`Quantity of ${item.food.name}`}
          />
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            required
            className={`${FIELD} w-20`}
            aria-label={`Unit for ${item.food.name}`}
          />
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={FIELD}
            aria-label={`Location of ${item.food.name}`}
          >
            {pantryLocations().map((loc) => (
              <option key={loc.key} value={loc.key}>
                {loc.label}
              </option>
            ))}
            {/* A stored key no longer in the registry still round-trips (§10). */}
            {!pantryLocations().some((loc) => loc.key === location) && (
              <option value={location}>{location}</option>
            )}
          </select>
          <input
            type="date"
            value={expiresOn}
            onChange={(e) => setExpiresOn(e.target.value)}
            className={FIELD}
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
