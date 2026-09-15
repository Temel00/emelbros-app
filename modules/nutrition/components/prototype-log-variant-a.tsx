"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #122 resolves.
 *
 * Variant A — "Tabbed entry": one Log button opens a dialog with an
 * explicit three-way segmented control (Cooked / Food / Freeform — no
 * shadcn Tabs primitive exists in this repo yet, so it's a manual
 * button-group styled like the meal-plan week/month toggle). The member
 * always sees and picks the mode before anything else.
 *
 * Tap counts from the Log button (dialog open doesn't count as a tap on
 * content):
 *  - Cooked, accept planned portion: pick meal → Log            = 2 taps
 *  - Food dictionary: search → pick food → Log                  = 3 taps
 *  - Freeform: type text → pick size chip → Log                 = 3 taps
 *  - Repeat an existing entry: tap the row's repeat icon         = 1 tap
 */
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FoodLinkPicker } from "@/modules/nutrition/components/food-link-picker";
import { LogDayList } from "@/modules/nutrition/components/prototype-log-day-list";
import type { LogVariantProps } from "@/modules/nutrition/components/prototype-log-harness";
import type { RoughGuessSize } from "@/modules/nutrition/components/prototype-log-shared";
import { ROUGH_GUESS_MACROS } from "@/modules/nutrition/components/prototype-log-shared";

type Mode = "cooked" | "food" | "freeform";

export function VariantA(props: LogVariantProps) {
  const { entries, editEntry, deleteEntry, repeatEntry } = props;
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("cooked");

  return (
    <div className="flex flex-col gap-4">
      <DialogRoot open={open} onOpenChange={setOpen}>
        <Button type="button" onClick={() => setOpen(true)} className="w-full">
          + Log something
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log a meal</DialogTitle>
          </DialogHeader>
          <div className="mb-3 flex gap-1 rounded-lg bg-muted p-1">
            {(["cooked", "food", "freeform"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-md px-2 py-1.5 text-sm font-medium capitalize transition-colors ${
                  mode === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "cooked"
                  ? "Cooked meal"
                  : m === "food"
                    ? "Food"
                    : "Freeform"}
              </button>
            ))}
          </div>

          {mode === "cooked" && (
            <CookedPanel
              todaysPlan={props.todaysPlan}
              onLog={(entry) => {
                props.logRecipe(entry.recipeId, entry.portion);
                setOpen(false);
              }}
            />
          )}
          {mode === "food" && (
            <FoodPanel
              foods={props.foods}
              onLog={(foodId, quantity) => {
                props.logFood(foodId, quantity);
                setOpen(false);
              }}
            />
          )}
          {mode === "freeform" && (
            <FreeformPanel
              onLog={(description, guess) => {
                props.logFreeform(description, guess);
                setOpen(false);
              }}
            />
          )}
        </DialogContent>
      </DialogRoot>

      <LogDayList
        entries={entries}
        onEdit={editEntry}
        onDelete={deleteEntry}
        onRepeat={repeatEntry}
      />
    </div>
  );
}

function CookedPanel({
  todaysPlan,
  onLog,
}: {
  todaysPlan: LogVariantProps["todaysPlan"];
  onLog: (entry: { recipeId: string; portion: number }) => void;
}) {
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [portion, setPortion] = useState(1);

  if (todaysPlan.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing planned for today — try Food or Freeform instead.
      </p>
    );
  }

  const picked = todaysPlan.find((p) => p.recipe?.id === pickedId);

  if (picked?.recipe) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">{picked.recipe.title}</p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => setPortion((p) => Math.max(0.25, p - 0.25))}
          >
            −
          </Button>
          <span className="w-20 text-center text-sm tabular-nums">
            {portion}× portion
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => setPortion((p) => p + 0.25)}
          >
            +
          </Button>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setPickedId(null)}
          >
            Back
          </Button>
          <Button
            type="button"
            onClick={() => onLog({ recipeId: picked.recipe!.id, portion })}
          >
            Log
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {todaysPlan.map((entry) => (
        <li key={entry.id}>
          <button
            type="button"
            disabled={!entry.recipe}
            onClick={() => entry.recipe && setPickedId(entry.recipe.id)}
            className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
          >
            <span className="capitalize">{entry.meal_slot}</span>
            <span>{entry.recipe?.title ?? entry.freeform_title ?? "—"}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function FoodPanel({
  foods,
  onLog,
}: {
  foods: LogVariantProps["foods"];
  onLog: (foodId: string, quantity: number) => void;
}) {
  const id = useId();
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("1");
  const picked = foods.find((f) => f.id === pickedId);

  if (picked) {
    return (
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          onLog(picked.id, Number(quantity));
        }}
        className="flex flex-col gap-3"
      >
        <p className="text-sm font-medium">{picked.name}</p>
        <Input
          id={`${id}-qty`}
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          autoFocus
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          aria-label={`Quantity in ${picked.unit}`}
        />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setPickedId(null)}
          >
            Back
          </Button>
          <Button type="submit">Log</Button>
        </div>
      </form>
    );
  }

  return (
    <FoodLinkPicker
      foods={foods}
      onPick={(food) => setPickedId(food.id)}
      onCancel={() => {}}
    />
  );
}

function FreeformPanel({
  onLog,
}: {
  onLog: (description: string, guess: RoughGuessSize) => void;
}) {
  const id = useId();
  const [description, setDescription] = useState("");
  const [guess, setGuess] = useState<RoughGuessSize | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <Input
        id={`${id}-desc`}
        autoFocus
        placeholder="What did you eat?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        aria-label="Freeform description"
      />
      <div className="flex flex-col gap-1">
        {(Object.keys(ROUGH_GUESS_MACROS) as RoughGuessSize[]).map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => setGuess(size)}
            className={`rounded-md border px-3 py-1.5 text-left text-sm ${
              guess === size
                ? "border-primary bg-primary/10"
                : "border-border hover:bg-muted"
            }`}
          >
            {ROUGH_GUESS_MACROS[size].label}
          </button>
        ))}
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          disabled={description.trim() === "" || !guess}
          onClick={() => guess && onLog(description.trim(), guess)}
        >
          Log
        </Button>
      </div>
    </div>
  );
}
