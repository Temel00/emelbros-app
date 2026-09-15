"use client";

/**
 * The logging view's client half (nutrition.md §3.5, wayfinder #123):
 * the "+ Log something" dialog (three entry paths settled by prototype
 * #122, Variant A "Tabbed entry") and today's day list (repeat/edit/delete).
 *
 * Structure lifted from `shopping-list-view.tsx`: each dialog owns its own
 * `useTransition` and local form state, seeded or reset explicitly from
 * `onOpenChange` rather than relying on whether the dialog unmounts its
 * content on close. Every write action already calls
 * `revalidatePath("/nutrition/log")` server-side, so this component never
 * mutates `entries` locally — a successful action just lets the next
 * server render supply the update.
 */
import { Copy, Pencil, Trash2 } from "lucide-react";
import { useId, useState, useTransition, type FormEvent } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteLogEntryAction,
  logCookedMealEntryAction,
  logFoodEntryAction,
  logFreeformEntryAction,
  repeatLogEntryAction,
  updateLogEntryAction,
  type UpdateLogEntryInput,
} from "@/modules/nutrition/actions";
import { FoodLinkPicker } from "@/modules/nutrition/components/food-link-picker";
import {
  logEntryDetail,
  logEntryDisplayText,
  logEntrySource,
  loggableCookedPlanEntries,
  scaleLogMacros,
  type LogEntrySource,
} from "@/modules/nutrition/lib/log-display";
import {
  ROUGH_GUESS_MACROS,
  type RoughGuessSize,
} from "@/modules/nutrition/lib/rough-guess";
import type {
  FoodRow,
  LogEntryRow,
  MealPlanEntryWithRecipe,
  RecipeRow,
} from "@/modules/nutrition/queries";

type Mode = "cooked" | "food" | "freeform";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function sourceIcon(source: LogEntrySource) {
  switch (source) {
    case "recipe":
      return "🍳";
    case "food":
      return "📦";
    case "freeform":
      return "✍️";
  }
}

export function LogView({
  entries,
  foods,
  recipes,
  todaysPlan,
}: {
  entries: LogEntryRow[];
  foods: FoodRow[];
  recipes: RecipeRow[];
  todaysPlan: MealPlanEntryWithRecipe[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function repeat(entry: LogEntryRow) {
    setError(null);
    startTransition(async () => {
      try {
        await repeatLogEntryAction(entry.id, new Date().toISOString());
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Couldn't log that again",
        );
      }
    });
  }

  function remove(entry: LogEntryRow, displayText: string) {
    if (!confirm(`Delete "${displayText}"?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteLogEntryAction(entry.id);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Couldn't delete that entry",
        );
      }
    });
  }

  const totalCalories = entries.reduce(
    (sum, entry) => sum + (entry.calories ?? 0),
    0,
  );

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <LogEntryDialog foods={foods} todaysPlan={todaysPlan} />

      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          Nothing logged yet today.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold">Today</h2>
            <span className="text-xs text-muted-foreground">
              {totalCalories} kcal total
            </span>
          </div>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {entries.map((entry) => (
              <LogRow
                key={entry.id}
                entry={entry}
                foods={foods}
                recipes={recipes}
                isPending={isPending}
                onRepeat={() => repeat(entry)}
                onDelete={(displayText) => remove(entry, displayText)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function LogEntryDialog({
  foods,
  todaysPlan,
}: {
  foods: FoodRow[];
  todaysPlan: MealPlanEntryWithRecipe[];
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("cooked");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setMode("cooked");
      setError(null);
    }
  }

  function logCooked(entryId: string, portionServings: number) {
    setError(null);
    startTransition(async () => {
      try {
        await logCookedMealEntryAction(entryId, {
          loggedAt: new Date().toISOString(),
          portionServings,
        });
        handleOpenChange(false);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Couldn't log that meal",
        );
      }
    });
  }

  function logFood(foodId: string, quantity: number) {
    setError(null);
    startTransition(async () => {
      try {
        await logFoodEntryAction({
          foodId,
          loggedAt: new Date().toISOString(),
          quantity,
        });
        handleOpenChange(false);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Couldn't log that food",
        );
      }
    });
  }

  function logFreeform(description: string, guess: RoughGuessSize) {
    setError(null);
    const macros = ROUGH_GUESS_MACROS[guess];
    startTransition(async () => {
      try {
        await logFreeformEntryAction({
          loggedAt: new Date().toISOString(),
          description,
          calories: macros.calories,
          proteinG: macros.proteinG,
          carbsG: macros.carbsG,
          fatG: macros.fatG,
        });
        handleOpenChange(false);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Couldn't log that entry",
        );
      }
    });
  }

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange}>
      <Button type="button" onClick={() => setOpen(true)} className="w-full">
        + Log something
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a meal</DialogTitle>
        </DialogHeader>
        <div className="mb-3 flex gap-1 rounded-lg bg-muted p-1">
          {(["cooked", "food", "freeform"] as const).map((m) => (
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
              {m === "cooked" ? "Cooked meal" : m === "food" ? "Food" : "Freeform"}
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {/* Keyed on `open` so each panel's local pick/search state starts
            fresh every time the dialog reopens, rather than depending on
            whether the dialog library unmounts its content on close. */}
        {mode === "cooked" && (
          <CookedPanel
            key={`cooked-${open}`}
            todaysPlan={todaysPlan}
            isPending={isPending}
            onLog={logCooked}
          />
        )}
        {mode === "food" && (
          <FoodPanel
            key={`food-${open}`}
            foods={foods}
            isPending={isPending}
            onLog={logFood}
          />
        )}
        {mode === "freeform" && (
          <FreeformPanel
            key={`freeform-${open}`}
            isPending={isPending}
            onLog={logFreeform}
          />
        )}
      </DialogContent>
    </DialogRoot>
  );
}

function CookedPanel({
  todaysPlan,
  isPending,
  onLog,
}: {
  todaysPlan: MealPlanEntryWithRecipe[];
  isPending: boolean;
  onLog: (entryId: string, portionServings: number) => void;
}) {
  const loggable = loggableCookedPlanEntries(todaysPlan);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [portion, setPortion] = useState(1);

  if (loggable.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing cooked yet today — mark a planned meal cooked, or try Food or
        Freeform instead.
      </p>
    );
  }

  const picked = loggable.find((entry) => entry.id === pickedId);

  if (picked?.recipe) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">{picked.recipe.title}</p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={isPending}
            onClick={() => setPortion((p) => Math.max(0.25, p - 0.25))}
          >
            −
          </Button>
          <span className="w-24 text-center text-sm tabular-nums">
            {portion}× portion
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={isPending}
            onClick={() => setPortion((p) => p + 0.25)}
          >
            +
          </Button>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() => setPickedId(null)}
          >
            Back
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={() => onLog(picked.id, portion)}
          >
            Log
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {loggable.map((entry) => (
        <li key={entry.id}>
          <button
            type="button"
            onClick={() => {
              setPickedId(entry.id);
              setPortion(entry.servings_planned);
            }}
            className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
          >
            <span className="capitalize">{entry.meal_slot}</span>
            <span>{entry.recipe?.title}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function FoodPanel({
  foods,
  isPending,
  onLog,
}: {
  foods: FoodRow[];
  isPending: boolean;
  onLog: (foodId: string, quantity: number) => void;
}) {
  const id = useId();
  const [pickedFood, setPickedFood] = useState<FoodRow | null>(null);
  const [quantity, setQuantity] = useState("1");

  if (pickedFood) {
    return (
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          onLog(pickedFood.id, Number(quantity));
        }}
        className="flex flex-col gap-3"
      >
        <p className="text-sm font-medium">{pickedFood.name}</p>
        <Input
          id={`${id}-qty`}
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          autoFocus
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          aria-label={`Quantity in ${pickedFood.unit}`}
        />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() => setPickedFood(null)}
          >
            Back
          </Button>
          <Button type="submit" disabled={isPending || !(Number(quantity) > 0)}>
            Log
          </Button>
        </div>
      </form>
    );
  }

  return (
    <FoodLinkPicker foods={foods} onPick={setPickedFood} onCancel={() => {}} />
  );
}

function FreeformPanel({
  isPending,
  onLog,
}: {
  isPending: boolean;
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
          disabled={isPending || description.trim() === "" || !guess}
          onClick={() => guess && onLog(description.trim(), guess)}
        >
          Log
        </Button>
      </div>
    </div>
  );
}

function LogRow({
  entry,
  foods,
  recipes,
  isPending,
  onRepeat,
  onDelete,
}: {
  entry: LogEntryRow;
  foods: FoodRow[];
  recipes: RecipeRow[];
  isPending: boolean;
  onRepeat: () => void;
  onDelete: (displayText: string) => void;
}) {
  const source = logEntrySource(entry);
  const displayText = logEntryDisplayText(entry, foods, recipes);
  const detail = logEntryDetail(entry);

  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <span aria-hidden className="text-lg">
        {sourceIcon(source)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{displayText}</p>
        <p className="truncate text-xs text-muted-foreground">
          {detail ? `${detail} · ` : ""}
          {formatTime(entry.logged_at)} · {entry.calories ?? 0} kcal
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={isPending}
        aria-label={`Log ${displayText} again`}
        onClick={onRepeat}
      >
        <Copy className="size-4" />
      </Button>
      <EditEntryDialog
        entry={entry}
        displayText={displayText}
        source={source}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={isPending}
        aria-label={`Delete ${displayText}`}
        onClick={() => onDelete(displayText)}
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}

function EditEntryDialog({
  entry,
  displayText,
  source,
}: {
  entry: LogEntryRow;
  displayText: string;
  source: LogEntrySource;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(String(entry.quantity ?? ""));
  const [description, setDescription] = useState(entry.description ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (next) {
      setQuantity(String(entry.quantity ?? ""));
      setDescription(entry.description ?? "");
      setError(null);
    }
    setOpen(next);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    let input: UpdateLogEntryInput;
    if (source === "freeform") {
      input = {
        loggedAt: entry.logged_at,
        description: description.trim(),
        quantity: entry.quantity,
        unit: entry.unit,
        calories: entry.calories,
        proteinG: entry.protein_g,
        carbsG: entry.carbs_g,
        fatG: entry.fat_g,
        note: entry.note,
      };
    } else {
      const newQuantity = Number(quantity);
      const macros = scaleLogMacros(entry, newQuantity);
      input = {
        loggedAt: entry.logged_at,
        description: entry.description,
        quantity: newQuantity,
        unit: entry.unit,
        calories: macros.calories,
        proteinG: macros.proteinG,
        carbsG: macros.carbsG,
        fatG: macros.fatG,
        note: entry.note,
      };
    }

    startTransition(async () => {
      try {
        await updateLogEntryAction(entry.id, input);
        handleOpenChange(false);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Couldn't save that change",
        );
      }
    });
  }

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Edit ${displayText}`}
        onClick={() => handleOpenChange(true)}
      >
        <Pencil className="size-4" />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {source === "recipe" && (
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${id}-portion`}>Portion (× planned)</Label>
              <Input
                id={`${id}-portion`}
                type="number"
                inputMode="decimal"
                step="0.25"
                min="0.25"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                autoFocus
              />
            </div>
          )}
          {source === "food" && (
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${id}-qty`}>Quantity ({entry.unit})</Label>
              <Input
                id={`${id}-qty`}
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                autoFocus
              />
            </div>
          )}
          {source === "freeform" && (
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${id}-desc`}>Description</Label>
              <Input
                id={`${id}-desc`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <DialogClose className={buttonVariants({ variant: "ghost" })}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
