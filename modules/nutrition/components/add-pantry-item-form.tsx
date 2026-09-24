"use client";

import { Link2, X } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FoodLinkPicker } from "@/modules/nutrition/components/food-link-picker";
import { RoundedSelect } from "@/modules/nutrition/components/rounded-select";
import { SpinnerInput } from "@/modules/nutrition/components/spinner-input";
import { addPantryItemAction } from "@/modules/nutrition/actions";
import {
  DEFAULT_LOCATION_KEY,
  DEFAULT_UNIT_KEY,
} from "@/modules/nutrition/lib/defaults";
import type {
  FoodRow,
  PantryLocationRow,
  UnitRow,
} from "@/modules/nutrition/queries";

/**
 * Adds a pantry line (docs/modules/nutrition.md §3.2). Food-first linking
 * via `FoodLinkPicker` (§3.1, §3.3, wayfinder #130): search the dictionary,
 * pick a match, or add a new entry inline without leaving the form.
 *
 * Numeric fields are held as strings and parsed on submit — an in-progress
 * "1." or "" is a valid thing to be typing, and the server action is what
 * rejects a genuinely bad value.
 */
export function AddPantryItemForm({
  foods,
  units,
  locations,
}: {
  foods: FoodRow[];
  units: UnitRow[];
  locations: PantryLocationRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [pickedFood, setPickedFood] = useState<FoodRow | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState(DEFAULT_UNIT_KEY);
  const [location, setLocation] = useState(DEFAULT_LOCATION_KEY);
  const [expiresOn, setExpiresOn] = useState("");

  // Managed vocabularies as {value: key, label} pairs (ADR-0017): the store
  // holds keys (`fl_oz`), the picker shows labels (`fl oz`). A picked food's
  // base unit that's since been archived still round-trips rather than
  // silently switching the line's unit.
  const unitOptions = [
    ...units.map((u) => ({ value: u.key, label: u.label })),
    ...(units.some((u) => u.key === unit)
      ? []
      : [{ value: unit, label: unit }]),
  ];
  const locationOptions = locations.map((loc) => ({
    value: loc.key,
    label: loc.label,
  }));

  function pickFood(food: FoodRow) {
    setPickedFood(food);
    // Adopt the picked food's own unit — v1 does no conversion (§8), so the
    // line is counted in the unit its nutrition facts are expressed in. It's
    // a managed key (the food's FK guarantees it); a fallback option below
    // keeps it selectable even if that unit has since been archived.
    setUnit(food.unit);
  }

  function reset() {
    setPickedFood(null);
    setQuantity("1");
    setUnit(DEFAULT_UNIT_KEY);
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
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {pickedFood === null ? (
        <FoodLinkPicker
          foods={foods}
          units={units}
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

          <SpinnerInput
            value={quantity}
            onChange={setQuantity}
            min={0}
            className="w-28"
            aria-label="Quantity"
          />

          <RoundedSelect
            value={unit}
            onChange={setUnit}
            options={unitOptions}
            aria-label="Unit"
            className="w-24"
          />

          <RoundedSelect
            value={location}
            onChange={setLocation}
            options={locationOptions}
            aria-label="Location"
            className="w-auto"
          />

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
