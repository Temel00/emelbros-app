"use client";

import { Search, X } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createFoodAction } from "@/modules/nutrition/actions";
import type { FoodRow } from "@/modules/nutrition/queries";

/**
 * The food-first search step of linking an ingredient line
 * (nutrition.md §3.3, wayfinder #113's resolution): search the dictionary
 * first, pick a match, or add a new entry inline without leaving the line.
 * The "add new food" fields mirror the pantry's food picker
 * (`add-pantry-item-form.tsx`) exactly — same required nutrition facts —
 * since this is the same affordance reshaped for a search-first flow.
 */
export function FoodLinkPicker({
  foods,
  initialQuery = "",
  onPick,
  onCancel,
}: {
  foods: FoodRow[];
  initialQuery?: string;
  onPick: (food: FoodRow) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [unit, setUnit] = useState("g");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");

  const matches = foods.filter((food) =>
    food.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function startAdding(seedName: string) {
    setName(seedName);
    setAdding(true);
  }

  function submitNewFood(event: FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const food = await createFoodAction({
          name,
          brand: brand.trim() === "" ? null : brand,
          unit,
          caloriesPerUnit: Number(calories),
          proteinGPerUnit: Number(protein),
          carbsGPerUnit: Number(carbs),
          fatGPerUnit: Number(fat),
          fiberGPerUnit: fiber.trim() === "" ? null : Number(fiber),
        });
        onPick(food);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Couldn't add that food",
        );
      }
    });
  }

  if (adding) {
    return (
      <form
        onSubmit={submitNewFood}
        className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3"
      >
        <p className="text-xs font-semibold text-muted-foreground">
          New food — nutrition facts per unit
        </p>
        <div className="flex flex-wrap gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            placeholder="Name"
            aria-label="Food name"
            className="min-w-32 flex-1"
          />
          <Input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Brand (optional)"
            aria-label="Brand"
            className="w-32"
          />
          <Input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            required
            placeholder="Unit"
            aria-label="Unit for the new food"
            className="w-20"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            required
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="Calories"
            aria-label="Calories per unit"
            className="w-24"
          />
          <Input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            required
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            placeholder="Protein (g)"
            aria-label="Protein per unit"
            className="w-24"
          />
          <Input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            required
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            placeholder="Carbs (g)"
            aria-label="Carbs per unit"
            className="w-24"
          />
          <Input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            required
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            placeholder="Fat (g)"
            aria-label="Fat per unit"
            className="w-24"
          />
          <Input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={fiber}
            onChange={(e) => setFiber(e.target.value)}
            placeholder="Fibre (g, optional)"
            aria-label="Fibre per unit"
            className="w-28"
          />
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAdding(false)}
          >
            Back
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            Add &amp; link
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2">
      <div className="flex items-center gap-2">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the food dictionary…"
          aria-label="Search foods"
          className="min-w-0 flex-1"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Cancel linking"
          onClick={onCancel}
        >
          <X className="size-4" />
        </Button>
      </div>
      <ul className="flex max-h-48 flex-col overflow-y-auto">
        {matches.map((food) => (
          <li key={food.id}>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => onPick(food)}
            >
              <span>
                {food.brand ? `${food.name} (${food.brand})` : food.name}
              </span>
              <span className="text-xs text-muted-foreground">
                base unit: {food.unit}
              </span>
            </button>
          </li>
        ))}
        {query.trim() !== "" && (
          <li>
            <button
              type="button"
              className="w-full rounded-md px-2 py-1.5 text-left text-sm text-primary hover:bg-muted"
              onClick={() => startAdding(query.trim())}
            >
              + Add “{query.trim()}” as a new food
            </button>
          </li>
        )}
        {matches.length === 0 && query.trim() === "" && (
          <li className="px-2 py-1.5 text-xs text-muted-foreground">
            Type to search, or close this to leave the line freeform.
          </li>
        )}
      </ul>
    </div>
  );
}
