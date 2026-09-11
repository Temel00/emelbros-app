"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteMealPlanEntryAction,
  markMealPlanEntryCookedAction,
  updateMealPlanEntryAction,
  type CookDecrementLine,
} from "@/modules/nutrition/actions";
import {
  mealSlotDotClass,
  mealSlotIcon,
} from "@/modules/nutrition/components/meal-slot-badge";
import { getMealSlot } from "@/modules/nutrition/lib/meal-slots";
import { entryTitle } from "@/modules/nutrition/lib/plan-calendar";
import type { MealPlanEntryWithRecipe } from "@/modules/nutrition/queries";

/**
 * A single plan entry, everywhere it appears (week lanes, month peek): a
 * compact chip that opens its full detail — servings, cook-mode link,
 * mark-cooked with a decrement summary, editing servings, and removing
 * (nutrition.md §3.4, wayfinder #117). Adapted from the settled prototype's
 * `Chip` + `EntryDetailsDialog` (#116) onto the real server actions.
 */
export function PlanChip({
  entry,
  showSlotIndicator = true,
  className = "min-w-0 max-w-full rounded-full",
}: {
  entry: MealPlanEntryWithRecipe;
  showSlotIndicator?: boolean;
  /** Width/shape of the trigger chip — a pill by default (day-peek chip
   * list), or `"w-full rounded-md"` for a week lane's block-style cell. */
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const slot = getMealSlot(entry.meal_slot);
  const cooked = entry.cooked_at !== null;

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className={`flex items-center gap-1.5 border border-border bg-card px-2 py-1 text-left text-xs hover:bg-muted ${className} ${
              cooked ? "opacity-60" : ""
            }`}
          >
            {showSlotIndicator && (
              <>
                <span
                  className={`size-1.5 shrink-0 rounded-full ${mealSlotDotClass(slot.key)}`}
                  aria-hidden
                />
                {mealSlotIcon(slot, "size-3 shrink-0 text-muted-foreground")}
              </>
            )}
            <span
              className={`truncate ${cooked ? "text-muted-foreground line-through" : ""}`}
            >
              {entryTitle(entry)}
            </span>
          </button>
        }
      />
      <DialogContent>
        <EntryDetails entry={entry} onClose={() => setOpen(false)} />
      </DialogContent>
    </DialogRoot>
  );
}

function EntryDetails({
  entry,
  onClose,
}: {
  entry: MealPlanEntryWithRecipe;
  onClose: () => void;
}) {
  const slot = getMealSlot(entry.meal_slot);
  const cooked = entry.cooked_at !== null;

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [decrementLines, setDecrementLines] = useState<
    CookDecrementLine[] | null
  >(null);

  const [editingServings, setEditingServings] = useState(false);
  const [servings, setServings] = useState(String(entry.servings_planned));

  function markCooked() {
    setError(null);
    startTransition(async () => {
      try {
        const lines = await markMealPlanEntryCookedAction(entry.id);
        setDecrementLines(lines);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Couldn't mark that cooked",
        );
      }
    });
  }

  function saveServings() {
    setError(null);
    startTransition(async () => {
      try {
        await updateMealPlanEntryAction(entry.id, {
          planDate: entry.plan_date,
          mealSlot: entry.meal_slot,
          recipeId: entry.recipe_id,
          freeformTitle: entry.freeform_title,
          servingsPlanned: Number(servings),
        });
        setEditingServings(false);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Couldn't save that");
      }
    });
  }

  function remove() {
    if (!confirm(`Remove ${entryTitle(entry)} from the plan?`)) return;
    startTransition(async () => {
      await deleteMealPlanEntryAction(entry.id);
      onClose();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <DialogHeader>
        <DialogTitle>{entryTitle(entry)}</DialogTitle>
      </DialogHeader>

      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {mealSlotIcon(slot, "size-4")}
        <span>{slot.label}</span>
      </div>

      {editingServings ? (
        <div className="flex items-center gap-2">
          <Label htmlFor="servings-planned" className="sr-only">
            Servings planned
          </Label>
          <Input
            id="servings-planned"
            type="number"
            min="1"
            step="1"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            className="w-24"
            autoFocus
          />
          <Button size="sm" onClick={saveServings} disabled={isPending}>
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditingServings(false)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <p className="text-sm">
          {entry.servings_planned}{" "}
          {entry.servings_planned === 1 ? "serving" : "servings"} planned
          {entry.recipe && ` · recipe serves ${entry.recipe.servings}`}
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 pl-1"
            onClick={() => setEditingServings(true)}
          >
            Edit
          </Button>
        </p>
      )}

      {entry.recipe && (
        <Button
          size="sm"
          variant="outline"
          render={
            <Link href={`/nutrition/recipes/${entry.recipe.id}`}>
              Open in cook mode
            </Link>
          }
        />
      )}

      {cooked ? (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-primary" aria-hidden />
          Cooked
        </p>
      ) : (
        <Button size="sm" onClick={markCooked} disabled={isPending}>
          <Circle data-icon="inline-start" />
          Mark cooked
        </Button>
      )}

      {decrementLines && decrementLines.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Pantry updated</p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {decrementLines.map((line) => (
              <li key={line.foodName}>
                {line.foodName}: {line.amountUsed} {line.unit} used
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={remove}
          disabled={isPending}
        >
          <Trash2 data-icon="inline-start" />
          Remove
        </Button>
      </DialogFooter>
    </div>
  );
}
