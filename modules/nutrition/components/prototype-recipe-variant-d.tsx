"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #113 resolves.
 *
 * Round 2, variant D — "Spreadsheet ingredients": the ingredient editor is
 * a literal table, echoing the box above it. Every linked line carries three
 * explicit columns — linked food, amount, and a unit field that rolls up
 * from the food's base unit but stays a free-text override, since a recipe
 * may use "2 tbsp" of something the pantry tracks in grams. Those three
 * columns are the ones a future planning feature reads to debit the pantry
 * when a recipe is cooked (#113 round 2 brief) — nothing here writes that
 * yet, but the shape is deliberately ready for it.
 */

import { ChevronDown, ChevronUp, Search, Trash2, X } from "lucide-react";
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

function FoodSearchRow({
  foods,
  onPick,
  onClose,
}: {
  foods: FoodRow[];
  onPick: (foodId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const matches = foods.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <tr className="bg-muted/40">
      <td colSpan={7} className="p-2">
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2">
          <div className="flex items-center gap-2">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search foods…"
              className={`${FIELD} min-w-0 flex-1`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Cancel"
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          </div>
          {matches.length > 0 && (
            <ul className="flex max-h-40 flex-col overflow-y-auto">
              {matches.map((food) => (
                <li key={food.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={() => onPick(food.id)}
                  >
                    <span>{food.name}</span>
                    <span className="text-xs text-muted-foreground">
                      base unit: {food.unit}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </td>
    </tr>
  );
}

function IngredientTableRow({
  index,
  line,
  foods,
  onChange,
  onMove,
  onDelete,
}: {
  index: number;
  line: MockIngredient;
  foods: FoodRow[];
  onChange: (patch: Partial<MockIngredient>) => void;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const linked = foodLabel(foods, line.foodId);

  return (
    <>
      <tr className={index % 2 === 1 ? "bg-muted/20" : ""}>
        <td className="w-16 px-2 py-1.5">
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Move up"
              onClick={() => onMove("up")}
            >
              <ChevronUp className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Move down"
              onClick={() => onMove("down")}
            >
              <ChevronDown className="size-3.5" />
            </Button>
          </div>
        </td>
        <td className="min-w-40 px-2 py-1.5">
          <input
            value={line.displayText}
            onChange={(e) => onChange({ displayText: e.target.value })}
            placeholder="e.g. 2 cloves garlic, minced"
            className={`${FIELD} w-full`}
            aria-label="Ingredient line"
          />
        </td>
        <td className="min-w-36 px-2 py-1.5">
          {linked ? (
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
              + Link food
            </button>
          )}
        </td>
        <td className="w-24 px-2 py-1.5">
          <input
            type="number"
            value={line.quantity ?? ""}
            onChange={(e) =>
              onChange({
                quantity: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            placeholder="Amount"
            className={`${FIELD} w-full`}
            aria-label="Amount"
          />
        </td>
        <td className="w-24 px-2 py-1.5">
          <input
            type="text"
            value={line.unit ?? ""}
            onChange={(e) => onChange({ unit: e.target.value || null })}
            placeholder={linked?.unit ?? "unit"}
            className={`${FIELD} w-full`}
            aria-label="Unit for this recipe"
          />
        </td>
        <td className="w-10 px-2 py-1.5 text-right">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Delete line"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        </td>
      </tr>
      {picking && (
        <FoodSearchRow
          foods={foods}
          onPick={(foodId) => {
            const food = foods.find((f) => f.id === foodId);
            onChange({
              foodId,
              // Roll the food's base unit up as the recipe-line default —
              // still just a text field the cook can override.
              unit: line.unit ?? food?.unit ?? null,
            });
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </>
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
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
              <th className="w-16 px-2 py-1.5 text-left font-medium" />
              <th className="px-2 py-1.5 text-left font-medium">
                Ingredient line
              </th>
              <th className="px-2 py-1.5 text-left font-medium">
                Linked food
              </th>
              <th className="px-2 py-1.5 text-left font-medium">Amount</th>
              <th className="px-2 py-1.5 text-left font-medium">Unit</th>
              <th className="w-10 px-2 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {recipe.ingredients.map((line, i) => (
              <IngredientTableRow
                key={line.id}
                index={i}
                line={line}
                foods={foods}
                onChange={(patch) => updateIngredient(line.id, patch)}
                onMove={(direction) => moveLine(line.id, direction)}
                onDelete={() =>
                  onChange({
                    ...recipe,
                    ingredients: recipe.ingredients.filter(
                      (i) => i.id !== line.id,
                    ),
                  })
                }
              />
            ))}
          </tbody>
        </table>
      </div>
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

export function VariantD({
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
