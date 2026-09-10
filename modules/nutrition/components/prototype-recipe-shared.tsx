"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #113 resolves.
 *
 * Round 2 shared pieces: the spreadsheet-style recipe box and the Option-B
 * detail shell (Details / Instructions panels + cook mode), lifted out so
 * variants D, E, and F can hold those two decisions constant and differ
 * only in the ingredient-editing widget — the thing this round is actually
 * comparing.
 */

import {
  Beef,
  ChefHat,
  Clock,
  Egg,
  Salad,
  Soup,
  UtensilsCrossed,
} from "lucide-react";
import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import type { FoodRow } from "@/modules/nutrition/queries";
import {
  formatMinutes,
  RECIPE_CATEGORIES,
  totalTimeMinutes,
  type MockRecipe,
} from "./prototype-recipe-data";

export const FIELD =
  "h-9 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring";

export function foodLabel(foods: FoodRow[], foodId: string | null) {
  if (!foodId) return null;
  return foods.find((f) => f.id === foodId) ?? null;
}

const CATEGORY_ICON: Record<string, typeof UtensilsCrossed> = {
  Roast: Beef,
  "Batch cook": Soup,
  Soup: Soup,
  Breakfast: Egg,
  Salad: Salad,
  Weeknight: ChefHat,
};

function CategoryIcon({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const Icon = CATEGORY_ICON[category] ?? UtensilsCrossed;
  return <Icon className={className} aria-hidden />;
}

export function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

/**
 * The recipe box: a spreadsheet-like table rather than round 1's card grid.
 * Icon/image slot on the left, name next to it, then category and the three
 * time columns running right — a shape that scales to dozens of rows without
 * the eye having to hunt for the field it wants, the complaint the card grid
 * drew in review.
 */
export function RecipeTableBox({
  recipes,
  onSelect,
}: {
  recipes: MockRecipe[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            <th className="w-10 px-3 py-2 text-left font-medium" />
            <th className="px-2 py-2 text-left font-medium">Recipe</th>
            <th className="px-2 py-2 text-left font-medium">Category</th>
            <th className="px-2 py-2 text-right font-medium">Prep</th>
            <th className="px-2 py-2 text-right font-medium">Cook</th>
            <th className="px-2 py-2 text-right font-medium">Total</th>
            <th className="px-3 py-2 text-right font-medium">Servings</th>
          </tr>
        </thead>
        <tbody>
          {recipes.map((recipe, i) => (
            <tr
              key={recipe.id}
              onClick={() => onSelect(recipe.id)}
              className={`cursor-pointer text-left transition-colors hover:bg-muted/60 ${
                i % 2 === 1 ? "bg-muted/20" : ""
              }`}
            >
              <td className="px-3 py-2">
                <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <CategoryIcon category={recipe.category} className="size-4" />
                </span>
              </td>
              <td className="min-w-40 px-2 py-2 font-medium">
                {recipe.title}
              </td>
              <td className="px-2 py-2 text-muted-foreground">
                {recipe.category}
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                {formatMinutes(recipe.prepTimeMinutes)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                {formatMinutes(recipe.cookTimeMinutes)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums font-medium">
                {formatMinutes(totalTimeMinutes(recipe))}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                {recipe.servings}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Option B's "Details" panel, extended with the box's new columns. */
export function DetailsSection({
  recipe,
  onChange,
}: {
  recipe: MockRecipe;
  onChange: (recipe: MockRecipe) => void;
}) {
  return (
    <SectionCard title="Details">
      <input
        value={recipe.title}
        onChange={(e) => onChange({ ...recipe, title: e.target.value })}
        className={FIELD}
        aria-label="Title"
      />
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={recipe.category}
          onChange={(e) => onChange({ ...recipe, category: e.target.value })}
          className={`${FIELD} w-40`}
          aria-label="Category"
        >
          {RECIPE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          {!RECIPE_CATEGORIES.includes(
            recipe.category as (typeof RECIPE_CATEGORIES)[number],
          ) && <option value={recipe.category}>{recipe.category}</option>}
        </select>
        <input
          type="number"
          value={recipe.servings}
          onChange={(e) =>
            onChange({ ...recipe, servings: Number(e.target.value) })
          }
          className={`${FIELD} w-20`}
          aria-label="Servings"
        />
        <span className="text-sm text-muted-foreground">servings</span>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Prep
          <input
            type="number"
            min="0"
            value={recipe.prepTimeMinutes ?? ""}
            onChange={(e) =>
              onChange({
                ...recipe,
                prepTimeMinutes:
                  e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className={`${FIELD} w-20`}
            aria-label="Prep time in minutes"
          />
          min
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Cook
          <input
            type="number"
            min="0"
            value={recipe.cookTimeMinutes ?? ""}
            onChange={(e) =>
              onChange({
                ...recipe,
                cookTimeMinutes:
                  e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className={`${FIELD} w-20`}
            aria-label="Cook time in minutes"
          />
          min
        </label>
        <span className="text-sm text-muted-foreground">
          Total {formatMinutes(totalTimeMinutes(recipe))}
        </span>
      </div>
    </SectionCard>
  );
}

export function InstructionsSection({
  recipe,
  onChange,
}: {
  recipe: MockRecipe;
  onChange: (recipe: MockRecipe) => void;
}) {
  return (
    <SectionCard title="Instructions">
      <textarea
        value={recipe.instructions}
        onChange={(e) => onChange({ ...recipe, instructions: e.target.value })}
        rows={6}
        className="rounded-lg border border-input bg-background p-2.5 text-sm"
      />
    </SectionCard>
  );
}

export function CookMode({ recipe }: { recipe: MockRecipe }) {
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
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <CategoryIcon category={recipe.category} className="size-5" />
          </span>
          <div>
            <h2 className="text-2xl font-bold">{recipe.title}</h2>
            <p className="text-sm text-muted-foreground">
              {recipe.category} · {recipe.servings} servings
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" /> Prep{" "}
            {formatMinutes(recipe.prepTimeMinutes)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" /> Cook{" "}
            {formatMinutes(recipe.cookTimeMinutes)}
          </span>
          <span className="font-medium text-foreground">
            Total {formatMinutes(totalTimeMinutes(recipe))}
          </span>
        </div>
      </div>

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
              {line.displayText}
            </span>
          </li>
        ))}
      </ul>

      <p className="whitespace-pre-line text-base leading-relaxed">
        {recipe.instructions}
      </p>
    </div>
  );
}
