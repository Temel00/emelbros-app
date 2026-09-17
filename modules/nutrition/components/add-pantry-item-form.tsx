"use client";

import { Link2, X } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FoodLinkPicker } from "@/modules/nutrition/components/food-link-picker";
import { addPantryItemAction } from "@/modules/nutrition/actions";
import {
  DEFAULT_PANTRY_LOCATION,
  pantryLocations,
} from "@/modules/nutrition/lib/locations";
import type { FoodRow } from "@/modules/nutrition/queries";

/**
 * Adds a pantry line (docs/modules/nutrition.md §3.2). Food-first linking
 * via `FoodLinkPicker` (§3.1, §3.3, wayfinder #130): search the dictionary,
 * pick a match, or add a new entry inline without leaving the form.
 *
 * Numeric fields are held as strings and parsed on submit — an in-progress
 * "1." or "" is a valid thing to be typing, and the server action is what
 * rejects a genuinely bad value.
 */
export function AddPantryItemForm({ foods }: { foods: FoodRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [pickedFood, setPickedFood] = useState<FoodRow | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("");
  const [location, setLocation] = useState(DEFAULT_PANTRY_LOCATION);
  const [expiresOn, setExpiresOn] = useState("");

  function pickFood(food: FoodRow) {
    setPickedFood(food);
    // Adopt the picked food's own unit — v1 does no conversion (§8), so the
    // line is counted in the unit its nutrition facts are expressed in.
    setUnit(food.unit);
  }

  function reset() {
    setPickedFood(null);
    setQuantity("1");
    setUnit("");
    setExpiresOn("");
  }

  function submit() {
    if (!pickedFood) return;
    setError(null);

    startTransition(async () => {
      try {
        await addPantryItemAction({
          foodId: pickedFood.id,
          quantity: Number(quantity),
          unit,
          location,
          expiresOn: expiresOn === "" ? null : expiresOn,
        });
        reset();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Couldn't add that");
      }
    });
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border border-border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {pickedFood === null ? (
        <FoodLinkPicker
          foods={foods}
          onPick={pickFood}
          emptyHint="Type to search the food dictionary, or add a new one."
        />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPickedFood(null)}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
            aria-label={`Unlink ${pickedFood.name}`}
          >
            <Link2 className="size-3" /> {pickedFood.name}
            <X className="size-3" />
          </button>

          <Input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            className="w-24"
            aria-label="Quantity"
            placeholder="Qty"
          />

          <Input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            required
            className="w-20"
            aria-label="Unit"
            placeholder="Unit"
          />

          <Select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            aria-label="Location"
            className="w-auto"
          >
            {pantryLocations().map((loc) => (
              <option key={loc.key} value={loc.key}>
                {loc.label}
              </option>
            ))}
          </Select>

          <Input
            type="date"
            value={expiresOn}
            onChange={(e) => setExpiresOn(e.target.value)}
            className="w-auto"
            aria-label="Expiry date (optional)"
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {pickedFood !== null && (
        <div>
          <Button type="submit" size="sm" disabled={isPending}>
            Add to pantry
          </Button>
        </div>
      )}
    </form>
  );
}
