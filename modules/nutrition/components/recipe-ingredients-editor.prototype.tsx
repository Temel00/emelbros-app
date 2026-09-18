"use client";

// PROTOTYPE — search-first add-ingredient variants.
// Ticket: https://github.com/Temel00/emelbros-app/issues/151
// Branch: prototype/recipe-add-ingredient-151
// Remove when resolved.
//
// Three structurally different approaches to leading with food-dictionary search:
//   A  Accordion  — single "Add ingredient" opens a picker panel below the list;
//                   freeform is a secondary escape inside the open panel
//   B  Inline Row — "Add ingredient" appends a pending row to the ingredient list
//                   itself, starting in search mode
//   C  Two Paths  — equal-weight "Search foods" and "Add freeform" buttons make
//                   the choice explicit up front; no cross-path escapes

import { X } from "lucide-react";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FoodLinkPicker } from "@/modules/nutrition/components/food-link-picker";
import { IngredientRow } from "@/modules/nutrition/components/recipe-ingredients-editor";
import { moveIngredient } from "@/modules/nutrition/lib/ingredient-order";
import { ingredientRollupText } from "@/modules/nutrition/lib/recipe-ingredient";
import {
  addRecipeIngredientAction,
  deleteRecipeIngredientAction,
  moveRecipeIngredientAction,
  updateRecipeIngredientAction,
} from "@/modules/nutrition/actions";
import type { FoodRow, RecipeIngredientWithFood } from "@/modules/nutrition/queries";

type Props = {
  recipeId: string;
  ingredients: RecipeIngredientWithFood[];
  foods: FoodRow[];
};

type UpdatePatch = {
  foodId: string | null;
  displayText: string;
  quantity: number | null;
  unit: string | null;
  food: FoodRow | null;
};

function useListState(recipeId: string, serverIngredients: RecipeIngredientWithFood[]) {
  const [, startTransition] = useTransition();
  const [order, setOrder] = useState(serverIngredients);
  const [prev, setPrev] = useState(serverIngredients);
  if (serverIngredients !== prev) {
    setPrev(serverIngredients);
    setOrder(serverIngredients);
  }

  function handleDelete(id: string) {
    setOrder((o) => o.filter((l) => l.id !== id));
    startTransition(async () => {
      await deleteRecipeIngredientAction(recipeId, id);
    });
  }

  function handleMove(id: string, direction: "up" | "down") {
    const nextIds = moveIngredient(order.map((l) => l.id), id, direction);
    setOrder(nextIds.map((lid) => order.find((l) => l.id === lid)!));
    startTransition(async () => {
      await moveRecipeIngredientAction(recipeId, id, direction);
    });
  }

  function handleUpdate(id: string, patch: UpdatePatch) {
    setOrder((o) =>
      o.map((l) =>
        l.id === id
          ? {
              ...l,
              food_id: patch.foodId,
              display_text: patch.displayText,
              quantity: patch.quantity,
              unit: patch.unit,
              food: patch.food,
            }
          : l,
      ),
    );
    startTransition(async () => {
      await updateRecipeIngredientAction(recipeId, id, {
        foodId: patch.foodId,
        displayText: patch.displayText,
        quantity: patch.quantity,
        unit: patch.unit,
      });
    });
  }

  return { order, handleDelete, handleMove, handleUpdate, startTransition };
}

// ── Variant A: Accordion Picker ──────────────────────────────────────────────
//
// "Add ingredient" opens a search panel that slides in below the list.
// Freeform is a hidden escape reached via a link at the bottom of the panel.
//
//   IDLE       →  [+ Add ingredient] button
//   SEARCHING  →  FoodLinkPicker + "or add as freeform text →" link at bottom
//   FREEFORM   →  text input + "← search instead" link + [Add] + [×]

export function VariantAEditor({ recipeId, ingredients, foods }: Props) {
  const { order, handleDelete, handleMove, handleUpdate, startTransition } =
    useListState(recipeId, ingredients);
  const [mode, setMode] = useState<"idle" | "searching" | "freeform">("idle");
  const [freeText, setFreeText] = useState("");

  function pickFood(food: FoodRow) {
    setMode("idle");
    startTransition(async () => {
      await addRecipeIngredientAction(recipeId, {
        displayText: ingredientRollupText(null, food.unit, food.name),
        foodId: food.id,
        unit: food.unit,
      });
    });
  }

  function addFreeform(e: FormEvent) {
    e.preventDefault();
    const text = freeText.trim();
    if (!text) return;
    setFreeText("");
    setMode("idle");
    startTransition(async () => {
      await addRecipeIngredientAction(recipeId, { displayText: text });
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">Ingredients</h3>

      {order.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No ingredients yet — add the first line below.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {order.map((line, i) => (
            <IngredientRow
              key={line.id}
              line={line}
              foods={foods}
              canMoveUp={i > 0}
              canMoveDown={i < order.length - 1}
              onMove={(dir) => handleMove(line.id, dir)}
              onDelete={() => handleDelete(line.id)}
              onUpdate={(patch) => handleUpdate(line.id, patch)}
            />
          ))}
        </ul>
      )}

      {mode === "idle" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setMode("searching")}
        >
          + Add ingredient
        </Button>
      )}

      {mode === "searching" && (
        <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
          <FoodLinkPicker
            foods={foods}
            onPick={pickFood}
            onCancel={() => setMode("idle")}
            emptyHint="Search the food dictionary, or add a new food inline."
          />
          <div className="flex justify-end">
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => setMode("freeform")}
            >
              or add as freeform text →
            </button>
          </div>
        </div>
      )}

      {mode === "freeform" && (
        <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
          <button
            type="button"
            className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => {
              setFreeText("");
              setMode("searching");
            }}
          >
            ← search instead
          </button>
          <form onSubmit={addFreeform} className="flex gap-2">
            <Input
              autoFocus
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="e.g. salt to taste"
              className="flex-1"
              aria-label="Freeform ingredient"
            />
            <Button type="submit" size="sm">
              Add
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Cancel"
              onClick={() => {
                setFreeText("");
                setMode("idle");
              }}
            >
              <X className="size-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Variant B: Inline Row ────────────────────────────────────────────────────
//
// "Add ingredient" appends a pending row to the ingredient list itself.
// The pending row starts in search mode; "Add as freeform" converts it
// in place without leaving the list context.
//
//   [no pending]         →  [+ Add ingredient] below the list
//   pending (search)     →  row with FoodLinkPicker + [Add as freeform] + [Cancel]
//   pending (freeform)   →  row with text input + [← search] + [Add] + [Cancel]

export function VariantBEditor({ recipeId, ingredients, foods }: Props) {
  const { order, handleDelete, handleMove, handleUpdate, startTransition } =
    useListState(recipeId, ingredients);
  const [pending, setPending] = useState(false);
  const [pendingFreeform, setPendingFreeform] = useState(false);
  const [freeText, setFreeText] = useState("");

  function pickFood(food: FoodRow) {
    setPending(false);
    setPendingFreeform(false);
    startTransition(async () => {
      await addRecipeIngredientAction(recipeId, {
        displayText: ingredientRollupText(null, food.unit, food.name),
        foodId: food.id,
        unit: food.unit,
      });
    });
  }

  function addFreeform(e: FormEvent) {
    e.preventDefault();
    const text = freeText.trim();
    if (!text) return;
    setFreeText("");
    setPending(false);
    setPendingFreeform(false);
    startTransition(async () => {
      await addRecipeIngredientAction(recipeId, { displayText: text });
    });
  }

  function cancel() {
    setPending(false);
    setPendingFreeform(false);
    setFreeText("");
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">Ingredients</h3>

      {order.length === 0 && !pending ? (
        <p className="text-sm text-muted-foreground">
          No ingredients yet — add the first line below.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {order.map((line, i) => (
            <IngredientRow
              key={line.id}
              line={line}
              foods={foods}
              canMoveUp={i > 0}
              canMoveDown={i < order.length - 1}
              onMove={(dir) => handleMove(line.id, dir)}
              onDelete={() => handleDelete(line.id)}
              onUpdate={(patch) => handleUpdate(line.id, patch)}
            />
          ))}

          {pending && (
            <li className="flex flex-col gap-2 rounded-xl border border-dashed border-primary/40 bg-card p-3">
              {pendingFreeform ? (
                <>
                  <form onSubmit={addFreeform} className="flex gap-2">
                    <Input
                      autoFocus
                      value={freeText}
                      onChange={(e) => setFreeText(e.target.value)}
                      placeholder="e.g. salt to taste"
                      className="flex-1"
                      aria-label="Freeform ingredient"
                    />
                    <Button type="submit" size="sm">
                      Add
                    </Button>
                  </form>
                  <div className="flex items-center">
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                      onClick={() => setPendingFreeform(false)}
                    >
                      ← search instead
                    </button>
                    <button
                      type="button"
                      className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:underline"
                      onClick={cancel}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <FoodLinkPicker
                    foods={foods}
                    onPick={pickFood}
                    emptyHint="Search the food dictionary, or add a new food inline."
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingFreeform(true)}
                    >
                      Add as freeform text
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                      onClick={cancel}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </li>
          )}
        </ul>
      )}

      {!pending && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => {
            setPending(true);
            setPendingFreeform(false);
          }}
        >
          + Add ingredient
        </Button>
      )}
    </div>
  );
}

// ── Variant C: Two Paths ─────────────────────────────────────────────────────
//
// Two equal-weight buttons present the choice upfront; neither path is the
// default. No cross-path escapes after the choice is made — the user commits
// to one mode per add action.
//
//   IDLE       →  [Search foods]  [+ Add freeform]  (side by side)
//   SEARCHING  →  FoodLinkPicker; [×] returns to idle
//   FREEFORM   →  text input + [Add] + [×]; [×] returns to idle

export function VariantCEditor({ recipeId, ingredients, foods }: Props) {
  const { order, handleDelete, handleMove, handleUpdate, startTransition } =
    useListState(recipeId, ingredients);
  const [mode, setMode] = useState<"idle" | "searching" | "freeform">("idle");
  const [freeText, setFreeText] = useState("");

  function pickFood(food: FoodRow) {
    setMode("idle");
    startTransition(async () => {
      await addRecipeIngredientAction(recipeId, {
        displayText: ingredientRollupText(null, food.unit, food.name),
        foodId: food.id,
        unit: food.unit,
      });
    });
  }

  function addFreeform(e: FormEvent) {
    e.preventDefault();
    const text = freeText.trim();
    if (!text) return;
    setFreeText("");
    setMode("idle");
    startTransition(async () => {
      await addRecipeIngredientAction(recipeId, { displayText: text });
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">Ingredients</h3>

      {order.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No ingredients yet — add the first line below.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {order.map((line, i) => (
            <IngredientRow
              key={line.id}
              line={line}
              foods={foods}
              canMoveUp={i > 0}
              canMoveDown={i < order.length - 1}
              onMove={(dir) => handleMove(line.id, dir)}
              onDelete={() => handleDelete(line.id)}
              onUpdate={(patch) => handleUpdate(line.id, patch)}
            />
          ))}
        </ul>
      )}

      {mode === "idle" && (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setMode("searching")}
          >
            Search foods
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMode("freeform")}
          >
            + Add freeform
          </Button>
        </div>
      )}

      {mode === "searching" && (
        <FoodLinkPicker
          foods={foods}
          onPick={pickFood}
          onCancel={() => setMode("idle")}
          emptyHint="Search the food dictionary, or add a new food inline."
        />
      )}

      {mode === "freeform" && (
        <form onSubmit={addFreeform} className="flex gap-2">
          <Input
            autoFocus
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="e.g. salt to taste"
            className="flex-1"
            aria-label="Freeform ingredient line"
          />
          <Button type="submit" size="sm">
            Add
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Cancel"
            onClick={() => {
              setFreeText("");
              setMode("idle");
            }}
          >
            <X className="size-4" />
          </Button>
        </form>
      )}
    </div>
  );
}
