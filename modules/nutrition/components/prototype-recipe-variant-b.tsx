"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #113 resolves.
 *
 * Variant B — "Cards + cook mode": the recipe box is an image-slot card
 * grid, the editor is sectioned into distinct panels, and food-linking
 * reshapes the pantry's dropdown into a type-to-filter inline list with a
 * visible "linked" pill. Reading view is a deliberately different, larger
 * "cook mode" with a check-off ingredient list.
 */

import { ChevronDown, ChevronUp, Trash2, UtensilsCrossed } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { moveIngredient } from "@/modules/nutrition/lib/ingredient-order";
import type { FoodRow } from "@/modules/nutrition/queries";
import type { MockIngredient, MockRecipe } from "./prototype-recipe-data";

function foodLabel(foods: FoodRow[], foodId: string | null) {
  if (!foodId) return null;
  return foods.find((f) => f.id === foodId) ?? null;
}

function FoodLinkPicker({
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
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-2 shadow-sm">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search foods…"
        className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring"
      />
      <ul className="flex max-h-40 flex-col overflow-y-auto">
        {matches.map((food) => (
          <li key={food.id}>
            <button
              type="button"
              className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => onPick(food.id)}
            >
              {food.name}
            </button>
          </li>
        ))}
        {query.trim() !== "" && (
          <li>
            <button
              type="button"
              className="w-full rounded-md px-2 py-1.5 text-left text-sm text-primary hover:bg-muted"
              onClick={() => {
                // Prototype: not actually persisted — just links to a stub.
                onPick(`new:${query}`);
              }}
            >
              + Add “{query}” as a new food
            </button>
          </li>
        )}
        {matches.length === 0 && query.trim() === "" && (
          <li className="px-2 py-1.5 text-xs text-muted-foreground">
            Type to search the food dictionary
          </li>
        )}
      </ul>
      <Button type="button" variant="ghost" size="sm" onClick={onClose}>
        Cancel
      </Button>
    </div>
  );
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
  const [picking, setPicking] = useState(false);
  const linked = foodLabel(foods, line.foodId);
  const linkedNewFood = line.foodId?.startsWith("new:")
    ? line.foodId.slice(4)
    : null;

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-2">
        <input
          value={line.displayText}
          onChange={(e) => onChange({ displayText: e.target.value })}
          placeholder="e.g. 2 cloves garlic, minced"
          className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring"
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

      {picking ? (
        <FoodLinkPicker
          foods={foods}
          onPick={(foodId) => {
            onChange({ foodId });
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      ) : linked || linkedNewFood ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
          >
            🔗 {linked?.name ?? `${linkedNewFood} (new)`}
          </button>
          <input
            type="number"
            value={line.quantity ?? ""}
            onChange={(e) =>
              onChange({
                quantity:
                  e.target.value === "" ? null : Number(e.target.value),
              })
            }
            placeholder="Qty"
            className="h-8 w-20 rounded-lg border border-input bg-background px-2 text-sm"
          />
          <span className="text-xs text-muted-foreground">
            {linked?.unit ?? line.unit}
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="w-fit rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-foreground/40 hover:text-foreground"
        >
          + Link a food
        </button>
      )}
    </li>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
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
    <div className="flex flex-col gap-4">
      <SectionCard title="Details">
        <input
          value={recipe.title}
          onChange={(e) => onChange({ ...recipe, title: e.target.value })}
          className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm"
          aria-label="Title"
        />
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={recipe.servings}
            onChange={(e) =>
              onChange({ ...recipe, servings: Number(e.target.value) })
            }
            className="h-9 w-20 rounded-lg border border-input bg-background px-2.5 text-sm"
            aria-label="Servings"
          />
          <span className="text-sm text-muted-foreground">servings</span>
        </div>
      </SectionCard>

      <SectionCard title="Instructions">
        <textarea
          value={recipe.instructions}
          onChange={(e) =>
            onChange({ ...recipe, instructions: e.target.value })
          }
          rows={6}
          className="rounded-lg border border-input bg-background p-2.5 text-sm"
        />
      </SectionCard>

      <SectionCard title="Ingredients">
        <ul className="flex flex-col gap-2">
          {recipe.ingredients.map((line) => (
            <IngredientRow
              key={line.id}
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
      </SectionCard>
    </div>
  );
}

function CookMode({ recipe }: { recipe: MockRecipe }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold">{recipe.title}</h2>
        <p className="text-sm text-muted-foreground">
          {recipe.servings} servings
        </p>
      </div>

      <ul className="flex flex-col gap-1">
        {recipe.ingredients.map((line) => (
          <li key={line.id} className="flex items-center gap-3 py-1.5">
            <Checkbox
              checked={checked.has(line.id)}
              onCheckedChange={() => toggle(line.id)}
            />
            <span
              className={`text-base ${checked.has(line.id) ? "text-muted-foreground line-through" : ""}`}
            >
              {line.displayText}
            </span>
          </li>
        ))}
      </ul>

      <p className="whitespace-pre-line text-base leading-relaxed">
        {recipe.instructions}
      </p>
    </div>
  );
}

export function VariantB({
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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {draft.map((recipe) => (
        <button
          key={recipe.id}
          type="button"
          onClick={() => {
            setSelectedId(recipe.id);
            setMode("cook");
          }}
          className="flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex aspect-video items-center justify-center bg-muted">
            <UtensilsCrossed className="size-8 text-muted-foreground/50" />
          </div>
          <div className="flex flex-col gap-1 p-3">
            <p className="truncate text-sm font-semibold">{recipe.title}</p>
            <div className="flex gap-1.5">
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                {recipe.servings} servings
              </span>
              {recipe.ingredients.length > 0 && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                  {recipe.ingredients.length} ingredients
                </span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
