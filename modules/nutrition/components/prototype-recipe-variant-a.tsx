"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #113 resolves.
 *
 * Variant A — "Stay with Pantry": the recipe box is a dense bordered list
 * (same row shape as PantryItemRow), the editor reuses the exact plain
 * `<select>` + FIELD-class pattern AddPantryItemForm already uses, food
 * linking is the pantry's dropdown-plus-"add new food" sentinel verbatim.
 * The bet: zero new visual vocabulary, recipes read like just another
 * pantry-shaped screen.
 */

import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { moveIngredient } from "@/modules/nutrition/lib/ingredient-order";
import type { FoodRow } from "@/modules/nutrition/queries";
import type { MockIngredient, MockRecipe } from "./prototype-recipe-data";

const FIELD = "h-8 rounded-lg border border-border bg-background px-2 text-sm";
const NEW_FOOD = "__new";
const NO_FOOD = "";

function foodLabel(foods: FoodRow[], foodId: string | null) {
  if (!foodId) return null;
  return foods.find((f) => f.id === foodId) ?? null;
}

function IngredientRow({
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
  const [addingFood, setAddingFood] = useState(false);
  const linked = foodLabel(foods, line.foodId);

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border p-2">
      <div className="flex items-center gap-2">
        <div className="flex shrink-0 flex-col">
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

        <input
          type="text"
          value={line.displayText}
          onChange={(e) => onChange({ displayText: e.target.value })}
          className={`${FIELD} min-w-0 flex-1`}
          aria-label="Ingredient line"
        />

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Delete line"
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-8">
        <select
          value={line.foodId ?? NO_FOOD}
          onChange={(e) => {
            const value = e.target.value;
            if (value === NEW_FOOD) {
              setAddingFood(true);
              return;
            }
            onChange({ foodId: value === NO_FOOD ? null : value });
          }}
          className={`${FIELD} min-w-40`}
          aria-label="Linked food"
        >
          <option value={NO_FOOD}>— no food linked —</option>
          {foods.map((food) => (
            <option key={food.id} value={food.id}>
              {food.name}
            </option>
          ))}
          <option value={NEW_FOOD}>+ Add a new food…</option>
        </select>

        {linked && (
          <>
            <input
              type="number"
              value={line.quantity ?? ""}
              onChange={(e) =>
                onChange({
                  quantity: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className={`${FIELD} w-20`}
              aria-label="Quantity"
              placeholder="Qty"
            />
            <span className="text-xs text-muted-foreground">
              {linked.unit}
            </span>
          </>
        )}

        {!linked && (
          <span className="text-xs text-muted-foreground">
            unlinked — no nutrition math, no shopping-list line
          </span>
        )}
      </div>

      {addingFood && (
        <fieldset className="ml-8 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border p-2">
          <legend className="px-1 text-xs font-semibold text-muted-foreground">
            New food (prototype: not actually saved)
          </legend>
          <input className={`${FIELD} min-w-32 flex-1`} placeholder="Name" />
          <input className={`${FIELD} w-24`} placeholder="Calories" />
          <input className={`${FIELD} w-24`} placeholder="Protein (g)" />
          <Button
            type="button"
            size="sm"
            onClick={() => setAddingFood(false)}
          >
            Add
          </Button>
        </fieldset>
      )}
    </li>
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

  function deleteLine(id: string) {
    onChange({
      ...recipe,
      ingredients: recipe.ingredients.filter((i) => i.id !== id),
    });
  }

  function addLine() {
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
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={recipe.title}
          onChange={(e) => onChange({ ...recipe, title: e.target.value })}
          className={`${FIELD} min-w-40 flex-1`}
          aria-label="Title"
        />
        <input
          type="number"
          value={recipe.servings}
          onChange={(e) =>
            onChange({ ...recipe, servings: Number(e.target.value) })
          }
          className={`${FIELD} w-20`}
          aria-label="Servings"
        />
        <span className="text-xs text-muted-foreground">servings</span>
      </div>

      <textarea
        value={recipe.instructions}
        onChange={(e) => onChange({ ...recipe, instructions: e.target.value })}
        rows={5}
        className="rounded-lg border border-border bg-background p-2 text-sm"
        aria-label="Instructions"
      />

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold text-muted-foreground">
          Ingredients
        </h3>
        <ul className="flex flex-col gap-2">
          {recipe.ingredients.map((line) => (
            <IngredientRow
              key={line.id}
              line={line}
              foods={foods}
              onChange={(patch) => updateIngredient(line.id, patch)}
              onMove={(direction) => moveLine(line.id, direction)}
              onDelete={() => deleteLine(line.id)}
            />
          ))}
        </ul>
        <div>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            + Add ingredient
          </Button>
        </div>
      </div>
    </div>
  );
}

function RecipeReadingView({
  recipe,
  foods,
}: {
  recipe: MockRecipe;
  foods: FoodRow[];
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <div>
        <h2 className="text-lg font-semibold">{recipe.title}</h2>
        <p className="text-xs text-muted-foreground">
          {recipe.servings} servings
        </p>
      </div>
      <ul className="flex flex-col gap-1">
        {recipe.ingredients.map((line) => {
          const linked = foodLabel(foods, line.foodId);
          return (
            <li key={line.id} className="text-sm">
              {line.displayText}
              {linked && (
                <span className="text-muted-foreground"> · {linked.name}</span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="whitespace-pre-line text-sm text-muted-foreground">
        {recipe.instructions}
      </p>
    </div>
  );
}

export function VariantA({
  recipes,
  foods,
}: {
  recipes: MockRecipe[];
  foods: FoodRow[];
}) {
  const [draft, setDraft] = useState<MockRecipe[]>(recipes);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");

  const selected = draft.find((r) => r.id === selectedId) ?? null;

  if (selected) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
            ← Back to recipes
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMode(mode === "view" ? "edit" : "view")}
          >
            {mode === "view" ? "Edit" : "Done"}
          </Button>
        </div>
        {mode === "view" ? (
          <RecipeReadingView recipe={selected} foods={foods} />
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
    <ul className="flex flex-col gap-2">
      {draft.map((recipe) => (
        <li
          key={recipe.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
        >
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => {
              setSelectedId(recipe.id);
              setMode("view");
            }}
          >
            <p className="truncate text-sm font-medium">{recipe.title}</p>
            <p className="text-xs text-muted-foreground">
              {recipe.servings} servings
              {recipe.ingredients.length > 0 &&
                ` · ${recipe.ingredients.length} ingredients`}
            </p>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit ${recipe.title}`}
            onClick={() => {
              setSelectedId(recipe.id);
              setMode("edit");
            }}
          >
            <Pencil className="size-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
