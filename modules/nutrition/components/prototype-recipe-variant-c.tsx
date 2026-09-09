"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #113 resolves.
 *
 * Variant C — "Mobile-first, sheet-driven": the recipe box is a filterable,
 * expandable list (tap a row to preview ingredients inline, no navigation).
 * The editor uses larger touch targets and a two-line stacked ingredient
 * row. Food-linking opens a modal (reusing the platform's Dialog primitive)
 * rather than an inline widget — the heaviest-weight of the three
 * treatments, closest to a dedicated "picker" affordance.
 */

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog";
import { moveIngredient } from "@/modules/nutrition/lib/ingredient-order";
import type { FoodRow } from "@/modules/nutrition/queries";
import type { MockIngredient, MockRecipe } from "./prototype-recipe-data";

const FIELD_LG =
  "h-11 rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring";

function foodLabel(foods: FoodRow[], foodId: string | null) {
  if (!foodId) return null;
  return foods.find((f) => f.id === foodId) ?? null;
}

function FoodPickerDialog({
  open,
  onOpenChange,
  foods,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  foods: FoodRow[];
  onPick: (foodId: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const matches = foods.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link a food</DialogTitle>
        </DialogHeader>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search foods…"
          className={`${FIELD_LG} w-full`}
        />
        <ul className="mt-2 flex max-h-64 flex-col overflow-y-auto">
          {matches.map((food) => (
            <li key={food.id}>
              <button
                type="button"
                className="w-full rounded-md px-2 py-2.5 text-left text-base hover:bg-muted"
                onClick={() => {
                  onPick(food.id);
                  onOpenChange(false);
                }}
              >
                {food.name}
              </button>
            </li>
          ))}
          {query.trim() !== "" && (
            <li>
              <button
                type="button"
                className="w-full rounded-md px-2 py-2.5 text-left text-base text-primary hover:bg-muted"
                onClick={() => {
                  onPick(`new:${query}`);
                  onOpenChange(false);
                }}
              >
                + Add “{query}” as a new food
              </button>
            </li>
          )}
        </ul>
      </DialogContent>
    </DialogRoot>
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const linked = foodLabel(foods, line.foodId);
  const linkedNewFood = line.foodId?.startsWith("new:")
    ? line.foodId.slice(4)
    : null;

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <input
        value={line.displayText}
        onChange={(e) => onChange({ displayText: e.target.value })}
        placeholder="e.g. 2 cloves garlic, minced"
        className={`${FIELD_LG} w-full`}
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className={
            linked || linkedNewFood
              ? "flex h-9 flex-1 items-center gap-1.5 rounded-lg bg-secondary px-2.5 text-sm font-medium text-secondary-foreground"
              : "flex h-9 flex-1 items-center gap-1.5 rounded-lg border border-dashed border-border px-2.5 text-sm text-muted-foreground"
          }
        >
          {linked
            ? `🔗 ${linked.name}`
            : linkedNewFood
              ? `🔗 ${linkedNewFood} (new)`
              : "+ Link a food"}
        </button>

        {(linked || linkedNewFood) && (
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
            className={`${FIELD_LG} w-20`}
          />
        )}

        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label="Move up"
            onClick={() => onMove("up")}
          >
            <ChevronUp className="size-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label="Move down"
            onClick={() => onMove("down")}
          >
            <ChevronDown className="size-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label="Delete line"
            onClick={onDelete}
          >
            <Trash2 className="size-5" />
          </Button>
        </div>
      </div>

      <FoodPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        foods={foods}
        onPick={(foodId) => onChange({ foodId })}
      />
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
      <input
        value={recipe.title}
        onChange={(e) => onChange({ ...recipe, title: e.target.value })}
        className={`${FIELD_LG} w-full`}
        aria-label="Title"
      />

      <div className="flex items-center gap-2">
        <input
          type="number"
          value={recipe.servings}
          onChange={(e) =>
            onChange({ ...recipe, servings: Number(e.target.value) })
          }
          className={`${FIELD_LG} w-20`}
          aria-label="Servings"
        />
        <span className="text-base text-muted-foreground">servings</span>
      </div>

      <textarea
        value={recipe.instructions}
        onChange={(e) => onChange({ ...recipe, instructions: e.target.value })}
        rows={6}
        className="rounded-lg border border-input bg-background p-3 text-base"
      />

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Ingredients
        </h3>
        <ul className="flex flex-col gap-2">
          {recipe.ingredients.map((line) => (
            <IngredientRow
              key={line.id}
              line={line}
              foods={foods}
              onChange={(patch) =>
                onChange({
                  ...recipe,
                  ingredients: recipe.ingredients.map((i) =>
                    i.id === line.id ? { ...i, ...patch } : i,
                  ),
                })
              }
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
          className="h-11 w-full text-base"
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
    </div>
  );
}

function ExpandableRow({
  recipe,
  onOpen,
}: {
  recipe: MockRecipe;
  onOpen: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="rounded-lg border border-border">
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={onOpen}
        >
          <p className="truncate text-sm font-medium">{recipe.title}</p>
          <p className="text-xs text-muted-foreground">
            {recipe.servings} servings
            {recipe.ingredients.length > 0 &&
              ` · ${recipe.ingredients.length} ingredients`}
          </p>
        </button>
        {recipe.ingredients.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={expanded ? "Collapse" : "Preview ingredients"}
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </Button>
        )}
      </div>
      {expanded && (
        <ul className="flex flex-col gap-0.5 border-t border-border px-3 py-2">
          {recipe.ingredients.map((line) => (
            <li key={line.id} className="text-xs text-muted-foreground">
              {line.displayText}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function VariantC({
  recipes,
  foods,
}: {
  recipes: MockRecipe[];
  foods: FoodRow[];
}) {
  const [draft, setDraft] = useState<MockRecipe[]>(recipes);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const selected = draft.find((r) => r.id === selectedId) ?? null;

  if (selected) {
    return (
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => setSelectedId(null)}
        >
          ← Back to recipes
        </Button>
        <RecipeEditor
          recipe={selected}
          foods={foods}
          onChange={(next) =>
            setDraft(draft.map((r) => (r.id === next.id ? next : r)))
          }
        />
      </div>
    );
  }

  const visible = draft.filter((r) =>
    r.title.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-3">
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search recipes…"
        className={`${FIELD_LG} w-full`}
      />
      <ul className="flex flex-col gap-2">
        {visible.map((recipe) => (
          <ExpandableRow
            key={recipe.id}
            recipe={recipe}
            onOpen={() => setSelectedId(recipe.id)}
          />
        ))}
      </ul>
    </div>
  );
}
