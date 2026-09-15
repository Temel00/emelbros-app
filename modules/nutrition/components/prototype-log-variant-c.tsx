"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #122 resolves.
 *
 * Variant C — "Primary path, with escape hatches": today's planned meals
 * are big cards right on the page — no dialog, no search — each with its
 * own portion stepper and a Log button. That's the path the plan-following
 * majority case takes. Anyone logging something unplanned taps one
 * "Log something else" escape hatch, which expands the same search +
 * freeform surface as Variant B, but demoted to secondary.
 *
 * Tap counts landing on the page:
 *  - Cooked, accept planned portion: Log                  = 1 tap
 *  - Cooked, adjust portion: +/− any number of times → Log = 2+ taps
 *  - Food dictionary: escape hatch → search → pick → Log  = 3 taps (+ typing)
 *  - Freeform: escape hatch → type → pick size chip        = 2 taps (+ typing)
 *  - Repeat an existing entry: tap the row's repeat icon    = 1 tap
 */
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FoodLinkPicker } from "@/modules/nutrition/components/food-link-picker";
import { LogDayList } from "@/modules/nutrition/components/prototype-log-day-list";
import type { LogVariantProps } from "@/modules/nutrition/components/prototype-log-harness";
import {
  ROUGH_GUESS_MACROS,
  type RoughGuessSize,
} from "@/modules/nutrition/components/prototype-log-shared";

export function VariantC(props: LogVariantProps) {
  const { entries, editEntry, deleteEntry, repeatEntry, todaysPlan } = props;
  const [escapeOpen, setEscapeOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {todaysPlan.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-semibold">Today&rsquo;s plan</h2>
          {todaysPlan.map((entry) =>
            entry.recipe ? (
              <PlanCard
                key={entry.id}
                mealSlot={entry.meal_slot}
                title={entry.recipe.title}
                onLog={(portion) => props.logRecipe(entry.recipe!.id, portion)}
              />
            ) : null,
          )}
        </div>
      )}

      {!escapeOpen ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setEscapeOpen(true)}
        >
          Log something else
        </Button>
      ) : (
        <EscapeHatch
          foods={props.foods}
          onLogFood={(foodId, quantity) => {
            props.logFood(foodId, quantity);
            setEscapeOpen(false);
          }}
          onLogFreeform={(description, guess) => {
            props.logFreeform(description, guess);
            setEscapeOpen(false);
          }}
          onClose={() => setEscapeOpen(false)}
        />
      )}

      <LogDayList
        entries={entries}
        onEdit={editEntry}
        onDelete={deleteEntry}
        onRepeat={repeatEntry}
      />
    </div>
  );
}

function PlanCard({
  mealSlot,
  title,
  onLog,
}: {
  mealSlot: string;
  title: string;
  onLog: (portion: number) => void;
}) {
  const [portion, setPortion] = useState(1);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground capitalize">{mealSlot}</p>
        <p className="truncate text-sm font-medium">{title}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Decrease portion"
          onClick={() => setPortion((p) => Math.max(0.25, p - 0.25))}
        >
          −
        </Button>
        <span className="w-14 text-center text-xs tabular-nums">
          {portion}×
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Increase portion"
          onClick={() => setPortion((p) => p + 0.25)}
        >
          +
        </Button>
      </div>
      <Button type="button" size="sm" onClick={() => onLog(portion)}>
        Log
      </Button>
    </div>
  );
}

function EscapeHatch({
  foods,
  onLogFood,
  onLogFreeform,
  onClose,
}: {
  foods: LogVariantProps["foods"];
  onLogFood: (foodId: string, quantity: number) => void;
  onLogFreeform: (description: string, guess: RoughGuessSize) => void;
  onClose: () => void;
}) {
  const [pickedFoodId, setPickedFoodId] = useState<string | null>(null);
  const picked = foods.find((f) => f.id === pickedFoodId);
  const id = useId();
  const [quantity, setQuantity] = useState("1");
  const [freeform, setFreeform] = useState("");

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
      {picked ? (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            onLogFood(picked.id, Number(quantity));
          }}
          className="flex items-center gap-2"
        >
          <span className="flex-1 text-sm font-medium">{picked.name}</span>
          <Input
            id={`${id}-qty`}
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            autoFocus
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-20"
            aria-label={`Quantity in ${picked.unit}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPickedFoodId(null)}
          >
            Back
          </Button>
          <Button type="submit" size="sm">
            Log
          </Button>
        </form>
      ) : (
        <>
          <p className="text-xs font-semibold text-muted-foreground">
            Search the food dictionary
          </p>
          <FoodLinkPicker
            foods={foods}
            onPick={(food) => setPickedFoodId(food.id)}
            onCancel={onClose}
          />
        </>
      )}

      <div className="border-t border-border pt-2">
        <p className="mb-1 text-xs font-semibold text-muted-foreground">
          Or log freeform
        </p>
        <div className="flex flex-col gap-1.5">
          <Input
            placeholder="What did you eat?"
            value={freeform}
            onChange={(e) => setFreeform(e.target.value)}
            aria-label="Freeform description"
          />
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(ROUGH_GUESS_MACROS) as RoughGuessSize[]).map(
              (size) => (
                <button
                  key={size}
                  type="button"
                  disabled={freeform.trim() === ""}
                  onClick={() => onLogFreeform(freeform.trim(), size)}
                  className="rounded-full border border-border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-40"
                >
                  {ROUGH_GUESS_MACROS[size].label}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="self-end"
      >
        Close
      </Button>
    </div>
  );
}
