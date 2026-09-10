"use client";

import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import type { RecipeWithIngredients } from "@/modules/nutrition/queries";

/**
 * The large-type read view for actually cooking from (nutrition.md §3.3,
 * wayfinder #113's resolution): checking off ingredients as they go in and
 * reading the instructions at a size that works from across a kitchen.
 * Checked state is a local reading aid only — nothing is persisted, so
 * reopening the recipe always starts from a clean list.
 */
export function CookMode({ recipe }: { recipe: RecipeWithIngredients }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold">{recipe.title}</h2>
        <p className="text-sm text-muted-foreground">
          {recipe.servings} {recipe.servings === 1 ? "serving" : "servings"}
        </p>
      </div>

      {recipe.ingredients.length > 0 && (
        <ul className="flex flex-col gap-1">
          {recipe.ingredients.map((line) => (
            <li key={line.id} className="flex items-center gap-3 py-1.5">
              <Checkbox
                checked={checked.has(line.id)}
                onCheckedChange={() => toggle(line.id)}
              />
              <span
                className={`text-base ${checked.has(line.id) ? "text-muted-foreground line-through" : ""}`}
              >
                {line.display_text}
              </span>
            </li>
          ))}
        </ul>
      )}

      {recipe.instructions && (
        <p className="whitespace-pre-line text-base leading-relaxed">
          {recipe.instructions}
        </p>
      )}

      {recipe.notes && (
        <p className="whitespace-pre-line text-sm text-muted-foreground">
          {recipe.notes}
        </p>
      )}
    </div>
  );
}
