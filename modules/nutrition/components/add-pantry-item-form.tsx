"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  addFoodAndPantryItemAction,
  addPantryItemAction,
} from "@/modules/nutrition/actions";
import {
  DEFAULT_PANTRY_LOCATION,
  pantryLocations,
} from "@/modules/nutrition/lib/locations";
import type { FoodRow } from "@/modules/nutrition/queries";

/** Sentinel `<select>` value for the inline "add a new food" path (§3.1). */
const NEW_FOOD = "__new";

const FIELD = "h-8 rounded-lg border border-border bg-background px-2 text-sm";

/**
 * Adds a pantry line (docs/modules/nutrition.md §3.2). The food picker
 * offers the dictionary plus an inline "Add a new food…" option, so a
 * member is never blocked on the dictionary being complete before they can
 * record what's in the fridge (§3.1).
 *
 * Numeric fields are held as strings and parsed on submit — an in-progress
 * "1." or "" is a valid thing to be typing, and the server action is what
 * rejects a genuinely bad value.
 */
export function AddPantryItemForm({ foods }: { foods: FoodRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [foodId, setFoodId] = useState(foods[0]?.id ?? NEW_FOOD);
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState(foods[0]?.unit ?? "");
  const [location, setLocation] = useState(DEFAULT_PANTRY_LOCATION);
  const [expiresOn, setExpiresOn] = useState("");

  // New-food fields, used only while `foodId === NEW_FOOD`.
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [barcode, setBarcode] = useState("");
  const [newUnit, setNewUnit] = useState("g");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");

  const addingFood = foodId === NEW_FOOD;

  function selectFood(value: string) {
    setFoodId(value);
    // Adopt the picked food's own unit — v1 does no conversion (§8), so the
    // line is counted in the unit its nutrition facts are expressed in.
    const picked = foods.find((food) => food.id === value);
    if (picked) setUnit(picked.unit);
  }

  function reset() {
    setQuantity("1");
    setExpiresOn("");
    setName("");
    setBrand("");
    setBarcode("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setFiber("");
  }

  function submit() {
    setError(null);

    startTransition(async () => {
      try {
        if (addingFood) {
          await addFoodAndPantryItemAction({
            food: {
              name,
              brand,
              barcode,
              unit: newUnit,
              caloriesPerUnit: Number(calories),
              proteinGPerUnit: Number(protein),
              carbsGPerUnit: Number(carbs),
              fatGPerUnit: Number(fat),
              fiberGPerUnit: fiber.trim() === "" ? null : Number(fiber),
            },
            quantity: Number(quantity),
            location,
            expiresOn: expiresOn === "" ? null : expiresOn,
          });
        } else {
          await addPantryItemAction({
            foodId,
            quantity: Number(quantity),
            unit,
            location,
            expiresOn: expiresOn === "" ? null : expiresOn,
          });
        }
        reset();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Couldn't add that");
      }
    });
  }

  const macroFields = [
    { label: "Calories", value: calories, set: setCalories, required: true },
    { label: "Protein (g)", value: protein, set: setProtein, required: true },
    { label: "Carbs (g)", value: carbs, set: setCarbs, required: true },
    { label: "Fat (g)", value: fat, set: setFat, required: true },
    { label: "Fibre (g)", value: fiber, set: setFiber, required: false },
  ];

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border border-border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={foodId}
          onChange={(e) => selectFood(e.target.value)}
          className={`${FIELD} min-w-40 flex-1`}
          aria-label="Food"
        >
          {foods.map((food) => (
            <option key={food.id} value={food.id}>
              {food.brand ? `${food.name} (${food.brand})` : food.name}
            </option>
          ))}
          <option value={NEW_FOOD}>+ Add a new food…</option>
        </select>

        <input
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
          className={`${FIELD} w-24`}
          aria-label="Quantity"
          placeholder="Qty"
        />

        {!addingFood && (
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            required
            className={`${FIELD} w-20`}
            aria-label="Unit"
            placeholder="Unit"
          />
        )}

        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className={FIELD}
          aria-label="Location"
        >
          {pantryLocations().map((loc) => (
            <option key={loc.key} value={loc.key}>
              {loc.label}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={expiresOn}
          onChange={(e) => setExpiresOn(e.target.value)}
          className={FIELD}
          aria-label="Expiry date (optional)"
        />
      </div>

      {addingFood && (
        <fieldset className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <legend className="px-1 text-xs font-semibold text-muted-foreground">
            New food — nutrition facts per unit
          </legend>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={`${FIELD} min-w-40 flex-1`}
              aria-label="Food name"
              placeholder="Name"
            />
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className={`${FIELD} w-32`}
              aria-label="Brand (optional)"
              placeholder="Brand"
            />
            <input
              type="text"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              required
              className={`${FIELD} w-20`}
              aria-label="Unit for the new food"
              placeholder="Unit"
            />
            <input
              type="text"
              inputMode="numeric"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className={`${FIELD} w-36`}
              aria-label="Barcode (optional)"
              placeholder="Barcode"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {macroFields.map((field) => (
              <input
                key={field.label}
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={field.value}
                onChange={(e) => field.set(e.target.value)}
                required={field.required}
                className={`${FIELD} w-28`}
                aria-label={`${field.label} per unit`}
                placeholder={field.label}
              />
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Facts are per one {newUnit.trim() === "" ? "unit" : newUnit} — the
            same unit the pantry counts this food in.
          </p>
        </fieldset>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div>
        <Button type="submit" size="sm" disabled={isPending}>
          Add to pantry
        </Button>
      </div>
    </form>
  );
}
