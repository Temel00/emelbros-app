"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #113 resolves.
 *
 * Three variants of the recipe box + recipe editor, switchable via
 * `?variant=`, on the throwaway `/nutrition/recipe-prototype` route.
 */

import { PrototypeSwitcher } from "@/components/prototype/prototype-switcher";
import type { FoodRow } from "@/modules/nutrition/queries";
import { mockRecipes } from "./prototype-recipe-data";
import { VariantA } from "./prototype-recipe-variant-a";
import { VariantB } from "./prototype-recipe-variant-b";
import { VariantC } from "./prototype-recipe-variant-c";

const VARIANTS = [
  { key: "A", name: "Stay with Pantry" },
  { key: "B", name: "Cards + cook mode" },
  { key: "C", name: "Mobile sheet-driven" },
];

export function PrototypeRecipeHarness({
  variant,
  foods,
}: {
  variant: string;
  foods: FoodRow[];
}) {
  const linkFirstTwoTo = foods.slice(0, 2).map((f) => f.id);
  const recipes = mockRecipes(linkFirstTwoTo);

  return (
    <>
      {variant === "A" && <VariantA recipes={recipes} foods={foods} />}
      {variant === "B" && <VariantB recipes={recipes} foods={foods} />}
      {variant === "C" && <VariantC recipes={recipes} foods={foods} />}
      <PrototypeSwitcher variants={VARIANTS} current={variant} />
    </>
  );
}
