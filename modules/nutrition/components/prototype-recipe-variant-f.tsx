"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #113 resolves.
 *
 * Round 2, variant F — "Inventory preview cards": every ingredient line
 * carries amount + unit as permanent structured fields (not something that
 * only appears once a food is linked), and a linked line renders a live
 * preview of the deduction a future "mark as cooked" action would make —
 * "Cooking this will take 2 tbsp off Olive oil in the pantry" — plus a
 * mismatch warning when the recipe's unit doesn't match the food's pantry
 * unit, since that conversion is exactly what the planning feature this
 * round is prepping for will have to solve. Most explicit of the three
 * about the inventory-deduction future this widget exists to support.
 */

import { AlertTriangle, ChevronDown, ChevronUp, PackageMinus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { moveIngredient } from "@/modules/nutrition/lib/ingredient-order";
import type { FoodRow } from "@/modules/nutrition/queries";
import type { MockIngredient, MockRecipe } from "./prototype-recipe-data";
import {
  CookMode,
  DetailsSection,
  FIELD,
  InstructionsSection,
  RecipeTableBox,
  foodLabel,
} from "./prototype-recipe-shared";

function FoodLinkList({
  foods,
  onPick,
  onClose,
}: {
  foods: FoodRow[];
  onPick: (foodId: string | null) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const matches = foods.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-2">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search foods…"
        className={`${FIELD} h-8`}
      />
      <ul className="flex max-h-36 flex-col overflow-y-auto">
        {matches.map((food) => (
          <li key={food.id}>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => onPick(food.id)}
            >
              <span>{food.name}</span>
              <span className="text-xs text-muted-foreground">
                pantry unit: {food.unit}
              </span>
            </button>
          </li>
        ))}
        {matches.length === 0 && (
          <li className="px-2 py-1.5 text-xs text-muted-foreground">
            No matches
          </li>
        )}
      </ul>
      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => onPick(null)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Leave unlinked
        </button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/** The "this will happen when the recipe is cooked" preview — round 2's core ask. */
function DeductionPreview({
  food,
  quantity,
  unit,
}: {
  food: FoodRow;
  quantity: number | null;
  unit: string | null;
}) {
  const mismatch = unit !== null && unit !== food.unit;

  if (quantity === null) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <PackageMinus className="size-3.5" />
        Set an amount to preview what cooking this deducts from the pantry.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <PackageMinus className="size-3.5" />
        Cooking this recipe will take{" "}
        <span className="font-medium text-foreground">
          {quantity} {unit ?? food.unit}
        </span>{" "}
        off <span className="font-medium text-foreground">{food.name}</span>{" "}
        in the pantry.
      </p>
      {mismatch && (
        <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500">
          <AlertTriangle className="size-3.5" />
          Pantry tracks {food.name} in {food.unit} — this recipe&rsquo;s unit
          will need converting when deduction ships.
        </p>
      )}
    </div>
  );
}

function IngredientCard({
  line,
  foods,
  onChange,
  onMove,
  onDelete,
}: {
  line: MockIngredient;
  foods: FoodRow[];
  onChange: (patch: Partial<MockIngredient>) => void;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const linked = foodLabel(foods, line.foodId);

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-2">
        <input
          value={line.displayText}
          onChange={(e) => onChange({ displayText: e.target.value })}
          placeholder="e.g. 2 cloves garlic, minced"
          className={`${FIELD} min-w-0 flex-1`}
        />
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label="Move up"
            onClick={() => onMove("up")}
          >
            <ChevronUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label="Move down"
            onClick={() => onMove("down")}
          >
            <ChevronDown className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label="Delete line"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Amount
          <input
            type="number"
            value={line.quantity ?? ""}
            onChange={(e) =>
              onChange({
                quantity: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className={`${FIELD} h-8 w-20`}
            aria-label="Amount"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Unit
          <input
            type="text"
            value={line.unit ?? ""}
            onChange={(e) => onChange({ unit: e.target.value || null })}
            placeholder={linked?.unit ?? "unit"}
            className={`${FIELD} h-8 w-20`}
            aria-label="Unit for this recipe"
          />
        </label>

        {picking ? (
          <div className="w-full">
            <FoodLinkList
              foods={foods}
              onPick={(foodId) => {
                const food = foods.find((f) => f.id === foodId);
                onChange({ foodId, unit: line.unit ?? food?.unit ?? null });
                setPicking(false);
              }}
              onClose={() => setPicking(false)}
            />
          </div>
        ) : linked ? (
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
          >
            🔗 {linked.name}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-foreground/40 hover:text-foreground"
          >
            + Link a food
          </button>
        )}
      </div>

      {linked && (
        <DeductionPreview food={linked} quantity={line.quantity} unit={line.unit} />
      )}
    </li>
  );
}

function IngredientsSection({
  recipe,
  foods,
  onChange,
}: {
  recipe: MockRecipe;
  foods: FoodRow[];
  onChange: (recipe: MockRecipe) => void;
}) {
  function updateIngredient(id: string, patch: Partial<MockIngredient>) {
    onChange({
      ...recipe,
      ingredients: recipe.ingredients.map((i) =>
        i.id === id ? { ...i, ...patch } : i,
      ),
    });
  }

  function moveLine(id: string, direction: "up" | "down") {
    const order = moveIngredient(
      recipe.ingredients.map((i) => i.id),
      id,
      direction,
    );
    onChange({
      ...recipe,
      ingredients: order.map(
        (lineId) => recipe.ingredients.find((i) => i.id === lineId)!,
      ),
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">Ingredients</h3>
      <ul className="flex flex-col gap-2">
        {recipe.ingredients.map((line) => (
          <IngredientCard
            key={line.id}
            line={line}
            foods={foods}
            onChange={(patch) => updateIngredient(line.id, patch)}
            onMove={(direction) => moveLine(line.id, direction)}
            onDelete={() =>
              onChange({
                ...recipe,
                ingredients: recipe.ingredients.filter((i) => i.id !== line.id),
              })
            }
          />
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() =>
          onChange({
            ...recipe,
            ingredients: [
              ...recipe.ingredients,
              {
                id: `new-${Date.now()}`,
                displayText: "",
                foodId: null,
                quantity: null,
                unit: null,
              },
            ],
          })
        }
      >
        + Add ingredient
      </Button>
    </div>
  );
}

function RecipeEditor({
  recipe,
  foods,
  onChange,
}: {
  recipe: MockRecipe;
  foods: FoodRow[];
  onChange: (recipe: MockRecipe) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <DetailsSection recipe={recipe} onChange={onChange} />
      <InstructionsSection recipe={recipe} onChange={onChange} />
      <IngredientsSection recipe={recipe} foods={foods} onChange={onChange} />
    </div>
  );
}

export function VariantF({
  recipes,
  foods,
}: {
  recipes: MockRecipe[];
  foods: FoodRow[];
}) {
  const [draft, setDraft] = useState<MockRecipe[]>(recipes);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"cook" | "edit">("cook");

  const selected = draft.find((r) => r.id === selectedId) ?? null;

  if (selected) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
            ← Recipe box
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMode(mode === "cook" ? "edit" : "cook")}
          >
            {mode === "cook" ? "Edit recipe" : "Cook mode"}
          </Button>
        </div>
        {mode === "cook" ? (
          <CookMode recipe={selected} />
        ) : (
          <RecipeEditor
            recipe={selected}
            foods={foods}
            onChange={(next) =>
              setDraft(draft.map((r) => (r.id === next.id ? next : r)))
            }
          />
        )}
      </div>
    );
  }

  return (
    <RecipeTableBox
      recipes={draft}
      onSelect={(id) => {
        setSelectedId(id);
        setMode("cook");
      }}
    />
  );
}
