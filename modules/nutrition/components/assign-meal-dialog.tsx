"use client";

import { useId, useState, useTransition } from "react";
import type { ReactElement } from "react";

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
import { Select } from "@/components/ui/select";
import { createMealPlanEntryAction } from "@/modules/nutrition/actions";
import {
  mealSlots as allMealSlots,
  type MealSlot,
} from "@/modules/nutrition/lib/meal-slots";
import type { RecipeRow } from "@/modules/nutrition/queries";

/**
 * Assigns a recipe (or a freeform title, for "leftovers"/"eating out") to a
 * date and meal slot (nutrition.md §3.4, wayfinder #117). Adapted from the
 * settled prototype's `AssignMealDialog` (#116) onto
 * `createMealPlanEntryAction`. The slot picker only appears when more than
 * one slot is offered — the week view's per-slot "+" trigger already knows
 * its slot, so it passes a single-element `slots` array to skip it, while
 * a day's "+ Add" trigger offers the full registry.
 */
export function AssignMealDialog({
  planDate,
  slots = allMealSlots(),
  recipes,
  trigger,
}: {
  planDate: string;
  slots?: MealSlot[];
  recipes: RecipeRow[];
  trigger: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"recipe" | "freeform">("recipe");
  const [mealSlot, setMealSlot] = useState(slots[0].key);
  const [query, setQuery] = useState("");
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [freeformTitle, setFreeformTitle] = useState("");
  const [servings, setServings] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const servingsId = useId();
  const titleId = useId();

  const matches = recipes.filter((recipe) =>
    recipe.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function reset() {
    setMode("recipe");
    setMealSlot(slots[0].key);
    setQuery("");
    setRecipeId(null);
    setFreeformTitle("");
    setServings("1");
    setError(null);
  }

  function pickRecipe(recipe: RecipeRow) {
    setRecipeId(recipe.id);
    setServings(String(recipe.servings));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await createMealPlanEntryAction({
          planDate,
          mealSlot,
          recipeId: mode === "recipe" ? recipeId : null,
          freeformTitle: mode === "freeform" ? freeformTitle : null,
          servingsPlanned: Number(servings),
        });
        setOpen(false);
        reset();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Couldn't add that");
      }
    });
  }

  const canSubmit =
    mode === "recipe" ? recipeId !== null : freeformTitle.trim() !== "";

  return (
    <DialogRoot
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plan a meal</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-2">
          {slots.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="meal-slot">Slot</Label>
              <Select
                id="meal-slot"
                value={mealSlot}
                onChange={(e) => setMealSlot(e.target.value)}
              >
                {slots.map((slot) => (
                  <option key={slot.key} value={slot.key}>
                    {slot.label}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="flex gap-1 rounded-lg bg-muted p-0.5">
            <button
              type="button"
              onClick={() => setMode("recipe")}
              className={`flex-1 rounded-md px-2 py-1 text-sm font-medium transition-colors ${
                mode === "recipe"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Recipe
            </button>
            <button
              type="button"
              onClick={() => setMode("freeform")}
              className={`flex-1 rounded-md px-2 py-1 text-sm font-medium transition-colors ${
                mode === "freeform"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Freeform
            </button>
          </div>

          {mode === "recipe" ? (
            <div className="flex flex-col gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search recipes…"
                aria-label="Search recipes"
                autoFocus
              />
              <ul className="flex max-h-40 flex-col overflow-y-auto rounded-lg border border-border">
                {matches.map((recipe) => (
                  <li key={recipe.id}>
                    <button
                      type="button"
                      onClick={() => pickRecipe(recipe)}
                      className={`flex w-full items-center justify-between px-2 py-1.5 text-left text-sm hover:bg-muted ${
                        recipeId === recipe.id ? "bg-muted" : ""
                      }`}
                    >
                      <span>{recipe.title}</span>
                      <span className="text-xs text-muted-foreground">
                        serves {recipe.servings}
                      </span>
                    </button>
                  </li>
                ))}
                {matches.length === 0 && (
                  <li className="px-2 py-1.5 text-xs text-muted-foreground">
                    No recipes match.
                  </li>
                )}
              </ul>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={titleId}>Title</Label>
              <Input
                id={titleId}
                value={freeformTitle}
                onChange={(e) => setFreeformTitle(e.target.value)}
                placeholder="Leftovers, eating out…"
                autoFocus
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={servingsId}>Servings</Label>
            <Input
              id={servingsId}
              type="number"
              min="1"
              step="1"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              className="w-24"
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button onClick={submit} disabled={isPending || !canSubmit}>
              Add
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </DialogRoot>
  );
}
