"use client";

import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Link2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState, useTransition, type ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FoodLinkPicker } from "@/modules/nutrition/components/food-link-picker";
import { DEFAULT_UNIT_KEY } from "@/modules/nutrition/lib/defaults";
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
  UnitRow,
} from "@/modules/nutrition/queries";

/**
 * The recipe's ordered ingredient lines (nutrition.md §3.3, wayfinder #113 &
 * decision #151): food-first linking, where the searchable `FoodLinkPicker`
 * leads. Picking a food generates the line's `display_text` from amount +
 * unit + food name rather than letting it be typed independently; unlinking
 * hands that text back as a normal freeform line. Reordering is the
 * platform's up/down `moveItem` convention (#27) — no free drag.
 *
 * Adding a line uses **Variant B (decision #151)**: "+ Add ingredient"
 * appends a pending row that opens in search mode, so the food dictionary is
 * the primary path; "Add as freeform text" converts that pending row in
 * place for a line with no matching food ("salt to taste").
 *
 * The unit is a **constrained managed select** (ADR-0017): a linked line's
 * unit is chosen from the active `nutrition_unit` vocabulary, so no freeform
 * string can reach the FK column. A unit that differs from the linked food's
 * base unit is accepted and flagged, never converted (ADR-0016).
 */
export function RecipeIngredientsEditor({
  recipeId,
  ingredients,
  foods,
  units,
}: {
  recipeId: string;
  ingredients: RecipeIngredientWithFood[];
  foods: FoodRow[];
  units: UnitRow[];
}) {
  const [draft, setDraft] = useState<null | { mode: "search" | "freeform" }>(
    null,
  );
  const [draftText, setDraftText] = useState("");
  const [, startTransition] = useTransition();

  const [order, setOrder] = useState(ingredients);
  const [prevIngredients, setPrevIngredients] = useState(ingredients);
  if (ingredients !== prevIngredients) {
    setPrevIngredients(ingredients);
    setOrder(ingredients);
  }

  function closeDraft() {
    setDraft(null);
    setDraftText("");
  }

  /** Variant B: picking a food from the pending row persists it as a linked
   *  line, defaulting its unit to the food's own base unit (always a valid
   *  managed key thanks to the `nutrition_food.unit` FK). Quantity is filled
   *  in on the row afterwards, the same as an existing linked line. */
  function addLinkedLine(food: FoodRow) {
    const unit = food.unit || DEFAULT_UNIT_KEY;
    closeDraft();
    startTransition(async () => {
      await addRecipeIngredientAction(recipeId, {
        displayText: ingredientRollupText(null, unit, food.name),
        foodId: food.id,
        quantity: null,
        unit,
      });
    });
  }

  function addFreeformLine() {
    const text = draftText.trim();
    if (text === "") return;
    closeDraft();
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

      {order.length === 0 && draft === null ? (
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
              units={units}
              canMoveUp={index > 0}
              canMoveDown={index < order.length - 1}
              onMove={(direction) => handleMove(line.id, direction)}
              onDelete={() => handleDelete(line.id)}
              onUpdate={(patch) => handleLineUpdate(line.id, patch)}
            />
          ))}

          {draft !== null && (
            <li className="flex items-start gap-2 rounded-xl border border-dashed border-border bg-card p-3">
              <div className="min-w-0 flex-1">
                {draft.mode === "search" ? (
                  <div className="flex flex-col gap-2">
                    <FoodLinkPicker
                      foods={foods}
                      onPick={addLinkedLine}
                      onCancel={closeDraft}
                      emptyHint="Type to search the food dictionary, or add this line as freeform text below."
                    />
                    <button
                      type="button"
                      className="self-start text-xs font-medium text-primary hover:underline"
                      onClick={() => setDraft({ mode: "freeform" })}
                    >
                      Add as freeform text
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      autoFocus
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addFreeformLine();
                        }
                      }}
                      placeholder="e.g. salt to taste"
                      aria-label="New freeform ingredient line"
                      className="min-w-0 flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="shrink-0"
                      onClick={addFreeformLine}
                    >
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Cancel"
                      onClick={closeDraft}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            </li>
          )}
        </ul>
      )}

      {draft === null && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setDraft({ mode: "search" })}
        >
          <Plus data-icon="inline-start" />
          Add ingredient
        </Button>
      )}
    </div>
  );
}

function IngredientRow({
  line,
  foods,
  units,
  canMoveUp,
  canMoveDown,
  onMove,
  onDelete,
  onUpdate,
}: {
  line: RecipeIngredientWithFood;
  foods: FoodRow[];
  units: UnitRow[];
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
    // Adopt the picked food's base unit unless one is already set — v1 does no
    // conversion (ADR-0016), so a line counts in the unit its food is
    // expressed in. The base unit is always a valid managed key (FK).
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

  /** Commit a linked line's amount/unit with explicit values, since a
   *  `<select>`'s onChange fires before its state has settled. */
  function commitLine(nextQuantityText: string, nextUnitText: string) {
    if (!line.food) return;
    const quantity =
      nextQuantityText.trim() === "" ? null : Number(nextQuantityText);
    const unit = nextUnitText.trim() === "" ? null : nextUnitText.trim();
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
    const baseUnit = line.food!.unit;
    const unitMismatch = unitText !== "" && unitText !== baseUnit;
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
              onBlur={() => commitLine(quantityText, unitText)}
              placeholder="Amount"
              className="h-8 w-24"
              aria-label="Amount"
            />
            <UnitSelect
              units={units}
              value={unitText}
              extraKeys={[baseUnit]}
              aria-label="Unit for this recipe"
              className="h-8 w-auto"
              onChange={(e) => {
                const nextUnit = e.target.value;
                setUnitText(nextUnit);
                commitLine(quantityText, nextUnit);
              }}
            />
          </div>
          {unitMismatch && (
            <p className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
              <AlertTriangle className="size-3 shrink-0" aria-hidden />
              Differs from the food&apos;s base unit ({baseUnit}) — the amount
              isn&apos;t converted, so macros aren&apos;t counted for this line.
            </p>
          )}
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

/**
 * A constrained unit picker over the active managed vocabulary (ADR-0017).
 * `extraKeys` keeps a value that isn't in the active list — e.g. a food whose
 * base unit has since been archived — selectable rather than silently
 * snapping to the first option.
 */
function UnitSelect({
  units,
  value,
  extraKeys = [],
  ...props
}: {
  units: UnitRow[];
  value: string;
  extraKeys?: string[];
} & Omit<ComponentProps<"select">, "value">) {
  const known = new Map(units.map((unit) => [unit.key, unit.label]));
  for (const key of [...extraKeys, value]) {
    if (key !== "" && !known.has(key)) known.set(key, key);
  }
  return (
    <Select value={value} {...props}>
      {[...known.entries()].map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </Select>
  );
}
