"use client";

import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, ChefHat, Pencil } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CookMode } from "@/modules/nutrition/components/cook-mode";
import { RecipeIngredientsEditor } from "@/modules/nutrition/components/recipe-ingredients-editor";
import { isBlank, isServingsCount } from "@/modules/nutrition/lib/validation";
import {
  setRecipeArchivedAction,
  updateRecipeAction,
} from "@/modules/nutrition/actions";
import type {
  FoodRow,
  RecipeWithIngredients,
} from "@/modules/nutrition/queries";

type Mode = "cook" | "edit";

const TEXTAREA =
  "rounded-lg border border-input bg-background p-2.5 text-sm outline-none focus-visible:border-ring";

/**
 * The recipe screen (nutrition.md §3.3, wayfinder #113's resolution):
 * a sectioned editor (Details / Instructions / Notes / Ingredients) plus a
 * separate large-type cook mode. A brand-new recipe has nothing to read
 * yet, so it opens straight into editing; anything with content opens to
 * cook mode, the reading view a kitchen actually gets used from.
 */
export function RecipeEditor({
  recipe,
  foods,
}: {
  recipe: RecipeWithIngredients;
  foods: FoodRow[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [mode, setMode] = useState<Mode>(
    recipe.instructions || recipe.ingredients.length > 0 ? "cook" : "edit",
  );

  const [title, setTitle] = useState(recipe.title);
  const [servingsText, setServingsText] = useState(String(recipe.servings));
  const [instructions, setInstructions] = useState(recipe.instructions ?? "");
  const [notes, setNotes] = useState(recipe.notes ?? "");
  const [archivedAt, setArchivedAt] = useState(recipe.archived_at);
  const [error, setError] = useState<string | null>(null);

  function saveDetails(
    patch: Partial<{
      title: string;
      servings: number;
      instructions: string;
      notes: string;
    }>,
  ) {
    const nextTitle = patch.title ?? title;
    const nextServings = patch.servings ?? Number(servingsText);
    const nextInstructions = patch.instructions ?? instructions;
    const nextNotes = patch.notes ?? notes;

    if (isBlank(nextTitle) || !isServingsCount(nextServings)) {
      setError(
        isBlank(nextTitle)
          ? "A recipe title is required"
          : "Servings must be a whole number of at least one",
      );
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await updateRecipeAction(recipe.id, {
          title: nextTitle,
          servings: nextServings,
          instructions: nextInstructions,
          notes: nextNotes,
        });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Couldn't save that");
      }
    });
  }

  function toggleArchived() {
    const next = archivedAt == null;
    setArchivedAt(next ? new Date().toISOString() : null);
    startTransition(async () => {
      await setRecipeArchivedAction(recipe.id, next);
    });
  }

  const cookModeRecipe: RecipeWithIngredients = {
    ...recipe,
    title,
    servings: Number(servingsText) || recipe.servings,
    instructions,
    notes,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/nutrition/recipes")}
        >
          ← Recipe box
        </Button>
        <div className="flex items-center gap-2">
          {archivedAt && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Archived
            </span>
          )}
          <Button variant="outline" size="sm" onClick={toggleArchived}>
            {archivedAt ? (
              <>
                <ArchiveRestore data-icon="inline-start" />
                Restore
              </>
            ) : (
              <>
                <Archive data-icon="inline-start" />
                Archive
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMode(mode === "cook" ? "edit" : "cook")}
          >
            {mode === "cook" ? (
              <>
                <Pencil data-icon="inline-start" />
                Edit recipe
              </>
            ) : (
              <>
                <ChefHat data-icon="inline-start" />
                Cook mode
              </>
            )}
          </Button>
        </div>
      </div>

      {mode === "cook" ? (
        <CookMode recipe={cookModeRecipe} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">Details</h3>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="recipe-title">Title</Label>
              <Input
                id="recipe-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => saveDetails({ title })}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="recipe-servings">Servings</Label>
              <Input
                id="recipe-servings"
                type="number"
                min="1"
                step="1"
                value={servingsText}
                onChange={(e) => setServingsText(e.target.value)}
                onBlur={() => saveDetails({ servings: Number(servingsText) })}
                className="w-20"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">Instructions</h3>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              onBlur={() => saveDetails({ instructions })}
              rows={8}
              className={TEXTAREA}
              placeholder="Step by step…"
              aria-label="Instructions"
            />
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => saveDetails({ notes })}
              rows={3}
              className={TEXTAREA}
              placeholder="Optional — substitutions, timing notes…"
              aria-label="Notes"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <RecipeIngredientsEditor
            recipeId={recipe.id}
            ingredients={recipe.ingredients}
            foods={foods}
          />
        </div>
      )}
    </div>
  );
}
