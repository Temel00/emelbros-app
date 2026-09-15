"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #122 resolves.
 *
 * Owns the mock `nutrition_log` state and hands it, plus handlers, to
 * whichever variant `?variant=` selects. Sharing this state logic (not
 * layout — each variant renders it however it wants) mirrors the #119
 * shopping-list prototype's harness.
 */
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { PrototypeSwitcher } from "@/components/prototype/prototype-switcher";
import {
  buildFrequentPicks,
  buildSeedEntries,
  foodLogEntry,
  freeformLogEntry,
  recipeLogEntry,
  todaysMealPlanEntries,
  type MockLogEntry,
  type RoughGuessSize,
} from "@/modules/nutrition/components/prototype-log-shared";
import { VariantA } from "@/modules/nutrition/components/prototype-log-variant-a";
import { VariantB } from "@/modules/nutrition/components/prototype-log-variant-b";
import { VariantC } from "@/modules/nutrition/components/prototype-log-variant-c";
import type {
  FoodRow,
  MealPlanEntryWithRecipe,
  RecipeRow,
} from "@/modules/nutrition/queries";

const VARIANTS = [
  { key: "A", name: "Tabbed entry" },
  { key: "B", name: "Unified search-first" },
  { key: "C", name: "Primary path + escape hatches" },
];

export type LogVariantProps = {
  entries: MockLogEntry[];
  editEntry: (id: string, patch: Partial<MockLogEntry>) => void;
  deleteEntry: (id: string) => void;
  repeatEntry: (entry: MockLogEntry) => void;
  logRecipe: (recipeId: string, portion: number) => void;
  logFood: (foodId: string, quantity: number) => void;
  logFreeform: (description: string, guess: RoughGuessSize) => void;
  todaysPlan: MealPlanEntryWithRecipe[];
  foods: FoodRow[];
  recipes: RecipeRow[];
  frequent: { foods: FoodRow[]; recipes: RecipeRow[] };
};

export function PrototypeLogHarness({
  foods,
  recipes,
  mealPlanEntries,
}: {
  foods: FoodRow[];
  recipes: RecipeRow[];
  mealPlanEntries: MealPlanEntryWithRecipe[];
}) {
  const searchParams = useSearchParams();
  const variant = searchParams.get("variant") ?? "A";

  const [entries, setEntries] = useState<MockLogEntry[]>(() =>
    buildSeedEntries(foods, recipes),
  );

  const todaysPlan = todaysMealPlanEntries(mealPlanEntries);
  const frequent = buildFrequentPicks(foods, recipes);

  function editEntry(id: string, patch: Partial<MockLogEntry>) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    );
  }

  function deleteEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function repeatEntry(entry: MockLogEntry) {
    setEntries((prev) => [
      ...prev,
      {
        ...entry,
        id: `${entry.id}-repeat-${Date.now()}`,
        loggedAt: new Date().toISOString(),
      },
    ]);
  }

  function logRecipe(recipeId: string, portion: number) {
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) return;
    setEntries((prev) => [...prev, recipeLogEntry(recipe, portion)]);
  }

  function logFood(foodId: string, quantity: number) {
    const food = foods.find((f) => f.id === foodId);
    if (!food) return;
    setEntries((prev) => [...prev, foodLogEntry(food, quantity)]);
  }

  function logFreeform(description: string, guess: RoughGuessSize) {
    setEntries((prev) => [...prev, freeformLogEntry(description, guess)]);
  }

  const props: LogVariantProps = {
    entries,
    editEntry,
    deleteEntry,
    repeatEntry,
    logRecipe,
    logFood,
    logFreeform,
    todaysPlan,
    foods,
    recipes,
    frequent,
  };

  return (
    <>
      {variant === "A" && <VariantA {...props} />}
      {variant === "B" && <VariantB {...props} />}
      {variant === "C" && <VariantC {...props} />}
      <PrototypeSwitcher variants={VARIANTS} current={variant} />
    </>
  );
}
