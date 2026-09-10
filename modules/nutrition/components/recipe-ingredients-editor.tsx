"use client";

import { ChevronDown, ChevronUp, Link2, Plus, Trash2, X } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FoodLinkPicker } from "@/modules/nutrition/components/food-link-picker";
import { moveIngredient } from "@/modules/nutrition/lib/ingredient-order";
import { ingredientRollupText } from "@/modules/nutrition/lib/recipe-ingredient";
import {
  addRecipeIngredientAction,
  deleteRecipeIngredientAction,
  moveRecipeIngredientAction,
  updateRecipeIngredientAction,
} from "@/modules/nutrition/actions";
import type {
  FoodRow,
  RecipeIngredientWithFood,
} from "@/modules/nutrition/queries";

/**
 * The recipe's ordered ingredient lines (nutrition.md §3.3, wayfinder #113's
 * resolution): food-first linking, where picking a food generates the
 * line's `display_text` from amount + unit + food name rather than letting
 * it be typed independently. Unlinking hands that text back as a normal
 * freeform line. Reordering is the platform's up/down `moveItem` convention
 * (#27) — no free drag.
 *
 * New lines are added through a short text form (mirroring the lists
 * module's "add an item" flow) rather than an in-place blank draft row,
 * since `addRecipeIngredientAction` requires non-blank text and a lone
 * "+ Add ingredient" button has nothing to submit yet.
 */
export function RecipeIngredientsEditor({
  recipeId,
  ingredients,
  foods,
}: {
  recipeId: string;
  ingredients: RecipeIngredientWithFood[];
  foods: FoodRow[];
}) {
  const [newLineText, setNewLineText] = useState("");
  const [, startTransition] = useTransition();

  const [order, setOrder] = useState(ingredients);
  const [prevIngredients, setPrevIngredients] = useState(ingredients);
  if (ingredients !== prevIngredients) {
    setPrevIngredients(ingredients);
    setOrder(ingredients);
  }

  function handleAddLine(event: FormEvent) {
    event.preventDefault();
    const text = newLineText.trim();
    if (text === "") return;

    setNewLineText("");
    startTransition(async () => {
      await addRecipeIngredientAction(recipeId, { displayText: text });
    });
  }

  function handleDelete(id: string) {
    setOrder((prev) => prev.filter((line) => line.id !== id));
    startTransition(async () => {
      await deleteRecipeIngredientAction(recipeId, id);
    });
  }

  function handleMove(id: string, direction: "up" | "down") {
    const nextIds = moveIngredient(
      order.map((line) => line.id),
      id,
      direction,
    );
    setOrder(nextIds.map((lineId) => order.find((l) => l.id === lineId)!));
    startTransition(async () => {
      await moveRecipeIngredientAction(recipeId, id, direction);
    });
  }

  function handleLineUpdate(
    id: string,
    patch: {
      foodId: string | null;
      displayText: string;
      quantity: number | null;
      unit: string | null;
      food: FoodRow | null;
    },
  ) {
    setOrder((prev) =>
      prev.map((line) =>
        line.id === id
          ? {
              ...line,
              food_id: patch.foodId,
              display_text: patch.displayText,
              quantity: patch.quantity,
              unit: patch.unit,
              food: patch.food,
            }
          : line,
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

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">Ingredients</h3>

      {order.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No ingredients yet — add the first line below.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {order.map((line, index) => (
            <IngredientRow
              key={line.id}
              line={line}
              foods={foods}
              canMoveUp={index > 0}
              canMoveDown={index < order.length - 1}
              onMove={(direction) => handleMove(line.id, direction)}
              onDelete={() => handleDelete(line.id)}
              onUpdate={(patch) => handleLineUpdate(line.id, patch)}
            />
          ))}
        </ul>
      )}

      <form onSubmit={handleAddLine} className="flex gap-2">
        <Input
          value={newLineText}
          onChange={(e) => setNewLineText(e.target.value)}
          placeholder="e.g. salt to taste"
          aria-label="New ingredient line"
        />
        <Button type="submit" size="icon" aria-label="Add ingredient line">
          <Plus />
        </Button>
      </form>
    </div>
  );
}

function IngredientRow({
  line,
  foods,
  canMoveUp,
  canMoveDown,
  onMove,
  onDelete,
  onUpdate,
}: {
  line: RecipeIngredientWithFood;
  foods: FoodRow[];
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
  onUpdate: (patch: {
    foodId: string | null;
    displayText: string;
    quantity: number | null;
    unit: string | null;
    food: FoodRow | null;
  }) => void;
}) {
  const [searching, setSearching] = useState(false);
  const [freeText, setFreeText] = useState(line.display_text);
  const [quantityText, setQuantityText] = useState(
    line.quantity == null ? "" : String(line.quantity),
  );
  const [unitText, setUnitText] = useState(line.unit ?? "");

  const isLinked = line.food !== null;

  function saveFreeText() {
    const text = freeText.trim();
    if (text === "" || text === line.display_text) return;
    onUpdate({
      foodId: null,
      displayText: text,
      quantity: null,
      unit: null,
      food: null,
    });
  }

  function pickFood(food: FoodRow) {
    const unit = unitText.trim() === "" ? food.unit : unitText;
    const quantity = quantityText.trim() === "" ? null : Number(quantityText);
    setUnitText(unit);
    setSearching(false);
    onUpdate({
      foodId: food.id,
      displayText: ingredientRollupText(quantity, unit, food.name),
      quantity,
      unit,
      food,
    });
  }

  function saveAmountOrUnit() {
    if (!line.food) return;
    const quantity = quantityText.trim() === "" ? null : Number(quantityText);
    const unit = unitText.trim() === "" ? null : unitText.trim();
    onUpdate({
      foodId: line.food.id,
      displayText: ingredientRollupText(quantity, unit, line.food.name),
      quantity,
      unit,
      food: line.food,
    });
  }

  function unlink() {
    setFreeText(line.display_text);
    setQuantityText("");
    setUnitText("");
    onUpdate({
      foodId: null,
      displayText: line.display_text,
      quantity: null,
      unit: null,
      food: null,
    });
  }

  const moveDeleteButtons = (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Move up"
        disabled={!canMoveUp}
        onClick={() => onMove("up")}
      >
        <ChevronUp className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Move down"
        disabled={!canMoveDown}
        onClick={() => onMove("down")}
      >
        <ChevronDown className="size-4" />
      </Button>
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
  );

  if (searching) {
    return (
      <li className="flex items-start gap-2 rounded-xl border border-border bg-card p-3">
        <div className="min-w-0 flex-1">
          <FoodLinkPicker
            foods={foods}
            onPick={pickFood}
            onCancel={() => setSearching(false)}
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
              aria-label={`Unlink ${line.food!.name}`}
            >
              <Link2 className="size-3" /> {line.food!.name}
              <X className="size-3" />
            </button>
            <Input
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              value={quantityText}
              onChange={(e) => setQuantityText(e.target.value)}
              onBlur={saveAmountOrUnit}
              placeholder="Amount"
              className="h-8 w-24"
              aria-label="Amount"
            />
            <Input
              type="text"
              value={unitText}
              onChange={(e) => setUnitText(e.target.value)}
              onBlur={saveAmountOrUnit}
              placeholder={line.food!.unit}
              className="h-8 w-24"
              aria-label="Unit for this recipe"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Reads as:{" "}
            <span className="text-foreground">{line.display_text || "—"}</span>
          </p>
        </div>
        {moveDeleteButtons}
      </li>
    );
  }

  return (
    <li className="flex items-start gap-2 rounded-xl border border-border bg-card p-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Input
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          onBlur={saveFreeText}
          placeholder="e.g. salt to taste"
          className="min-w-0 flex-1"
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
