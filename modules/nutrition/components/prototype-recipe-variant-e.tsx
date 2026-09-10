"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #113 resolves.
 *
 * Round 2, variant E — "Food-first linked rows": the opposite bet from D.
 * Instead of typing free text and optionally attaching a food, you search
 * and pick the food *first* — the ingredient line's text is then a rollup
 * generated from amount + unit + food name, not an independently-editable
 * field. The unit still rolls up from the food's base unit but is a
 * recipe-scoped override (a food tracked in grams can still read "2 tbsp"
 * on this recipe). Unlinking hands the generated text back as a normal
 * freeform line to edit by hand — for "salt to taste" lines that were never
 * going to have amount/unit/food in the first place.
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
} from "./prototype-recipe-shared";

/** The rollup text a linked line reads in cook mode: `2 tbsp Olive oil`. */
function rollupText(quantity: number | null, unit: string | null, name: string) {
  return [quantity, unit, name].filter((part) => part !== null && part !== "").join(" ");
}

function FoodSearchPanel({
  foods,
  query,
  onQueryChange,
  onPick,
  onPickNew,
  onClose,
}: {
  foods: FoodRow[];
  query: string;
  onQueryChange: (q: string) => void;
  onPick: (food: FoodRow) => void;
  onPickNew: (name: string) => void;
  onClose: () => void;
}) {
  const matches = foods.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2">
      <div className="flex items-center gap-2">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search the food dictionary…"
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
      <ul className="flex max-h-40 flex-col overflow-y-auto">
        {matches.map((food) => (
          <li key={food.id}>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => onPick(food)}
            >
              <span>{food.name}</span>
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
              onClick={() => onPickNew(query.trim())}
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
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");

  const linkedFood = line.foodId
    ? (foods.find((f) => f.id === line.foodId) ?? null)
    : null;
  const linkedNewName = line.foodId?.startsWith("new:")
    ? line.foodId.slice(4)
    : null;
  const isLinked = linkedFood !== null || linkedNewName !== null;
  const linkedName = linkedFood?.name ?? linkedNewName ?? "";

  function pickFood(food: FoodRow) {
    const unit = line.unit ?? food.unit;
    onChange({
      foodId: food.id,
      unit,
      displayText: rollupText(line.quantity, unit, food.name),
    });
    setSearching(false);
    setQuery("");
  }

  function pickNew(name: string) {
    onChange({
      foodId: `new:${name}`,
      displayText: rollupText(line.quantity, line.unit, `${name} (new)`),
    });
    setSearching(false);
    setQuery("");
  }

  function updateAmountOrUnit(patch: { quantity?: number | null; unit?: string | null }) {
    const nextQuantity = "quantity" in patch ? patch.quantity! : line.quantity;
    const nextUnit = "unit" in patch ? patch.unit! : line.unit;
    onChange({
      ...patch,
      displayText: rollupText(nextQuantity, nextUnit, linkedName),
    });
  }

  function unlink() {
    onChange({ foodId: null });
  }

  const moveDeleteButtons = (
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
  );

  if (searching) {
    return (
      <li className="flex items-start gap-2 rounded-xl border border-border bg-card p-3">
        <div className="min-w-0 flex-1">
          <FoodSearchPanel
            foods={foods}
            query={query}
            onQueryChange={setQuery}
            onPick={pickFood}
            onPickNew={pickNew}
            onClose={() => setSearching(false)}
          />
        </div>
        {moveDeleteButtons}
      </li>
    );
  }

  if (isLinked) {
    return (
      <li className="flex items-start gap-2 rounded-xl border border-border bg-card p-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={unlink}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
              aria-label={`Unlink ${linkedName}`}
            >
              🔗 {linkedName} <X className="size-3" />
            </button>
            <input
              type="number"
              value={line.quantity ?? ""}
              onChange={(e) =>
                updateAmountOrUnit({
                  quantity: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              placeholder="Amount"
              className={`${FIELD} h-8 w-24`}
              aria-label="Amount"
            />
            <input
              type="text"
              value={line.unit ?? ""}
              onChange={(e) => updateAmountOrUnit({ unit: e.target.value || null })}
              placeholder={linkedFood?.unit ?? "unit"}
              className={`${FIELD} h-8 w-24`}
              aria-label="Unit for this recipe"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Reads as: <span className="text-foreground">{line.displayText || "—"}</span>
          </p>
        </div>
        {moveDeleteButtons}
      </li>
    );
  }

  return (
    <li className="flex items-start gap-2 rounded-xl border border-border bg-card p-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <input
          value={line.displayText}
          onChange={(e) => onChange({ displayText: e.target.value })}
          placeholder="e.g. salt to taste"
          className={`${FIELD} min-w-0 flex-1`}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => setSearching(true)}
        >
          Link food
        </Button>
      </div>
      {moveDeleteButtons}
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
          <IngredientRow
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

export function VariantE({
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
