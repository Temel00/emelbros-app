"use server";

import { revalidatePath } from "next/cache";

import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import {
  isBlank,
  isServingsCount,
  isValidAmount,
  trimToNull,
} from "@/modules/nutrition/lib/validation";
import {
  moveIngredient,
  nextIngredientPosition,
} from "@/modules/nutrition/lib/ingredient-order";
import { computeCookDecrements } from "@/modules/nutrition/lib/pantry-decrement";
import {
  applyPantryDecrements,
  deleteMealPlanEntry,
  deletePantryItem,
  deleteRecipe,
  deleteRecipeIngredient,
  getMealPlanEntryForCooking,
  getPantryItemsForFoods,
  getRecipe,
  insertFood,
  insertMealPlanEntry,
  insertPantryItem,
  insertRecipe,
  insertRecipeIngredient,
  markMealPlanEntryCooked,
  setRecipeArchived,
  updateMealPlanEntry,
  updatePantryItem,
  updateRecipe,
  updateRecipeIngredient,
  updateRecipeIngredientPosition,
  type FoodRow,
  type MealPlanEntryRow,
  type RecipeRow,
} from "@/modules/nutrition/queries";

/**
 * Server actions behind the nutrition UI (nutrition.md §3.1, §3.2, #104).
 * Every write rides RLS (§2): both tables are fixed Family, so any
 * signed-in member may add, edit, or remove any row — the kitchen is
 * shared. These actions don't re-check that; a signed-out request just
 * comes back as a Postgres RLS error.
 */
async function requireMember() {
  const member = await getCurrentMember();
  if (!member) throw new Error("Not signed in");
  return member;
}

export type CreateFoodInput = {
  name: string;
  brand?: string | null;
  barcode?: string | null;
  unit: string;
  caloriesPerUnit: number;
  proteinGPerUnit: number;
  carbsGPerUnit: number;
  fatGPerUnit: number;
  fiberGPerUnit?: number | null;
};

function validateFood(input: CreateFoodInput) {
  if (isBlank(input.name)) throw new Error("Food name is required");
  if (isBlank(input.unit)) throw new Error("Unit is required");

  const macros = [
    input.caloriesPerUnit,
    input.proteinGPerUnit,
    input.carbsGPerUnit,
    input.fatGPerUnit,
  ];
  if (!macros.every(isValidAmount)) {
    throw new Error("Nutrition facts must be zero or more");
  }
  if (input.fiberGPerUnit != null && !isValidAmount(input.fiberGPerUnit)) {
    throw new Error("Fibre must be zero or more");
  }
}

/**
 * Adds a dictionary entry (§3.1). No approval step — any member can add a
 * food, and it's immediately usable from every food picker.
 */
export async function createFoodAction(
  input: CreateFoodInput,
): Promise<FoodRow> {
  validateFood(input);

  const member = await requireMember();
  const supabase = await createClient();

  const food = await insertFood(supabase, {
    name: input.name.trim(),
    brand: trimToNull(input.brand),
    barcode: trimToNull(input.barcode),
    unit: input.unit.trim(),
    caloriesPerUnit: input.caloriesPerUnit,
    proteinGPerUnit: input.proteinGPerUnit,
    carbsGPerUnit: input.carbsGPerUnit,
    fatGPerUnit: input.fatGPerUnit,
    fiberGPerUnit: input.fiberGPerUnit ?? null,
    createdBy: member.id,
  });

  revalidatePath("/nutrition");
  return food;
}

export type PantryItemInput = {
  quantity: number;
  unit: string;
  location: string;
  expiresOn?: string | null;
};

function validatePantryItem(input: PantryItemInput) {
  if (!isValidAmount(input.quantity)) {
    throw new Error("Quantity must be zero or more");
  }
  if (isBlank(input.unit)) throw new Error("Unit is required");
  if (isBlank(input.location)) throw new Error("Location is required");
}

/**
 * Adds a pantry line for an existing food (§3.2). `unit` defaults to the
 * food's own unit at the call site; v1 does no conversion (§8), so whatever
 * unit the line records is the unit it's counted in.
 */
export async function addPantryItemAction(
  input: PantryItemInput & { foodId: string },
) {
  validatePantryItem(input);
  if (isBlank(input.foodId)) throw new Error("A food is required");

  const member = await requireMember();
  const supabase = await createClient();

  await insertPantryItem(supabase, {
    foodId: input.foodId,
    quantity: input.quantity,
    unit: input.unit.trim(),
    location: input.location,
    expiresOn: trimToNull(input.expiresOn),
    addedBy: member.id,
  });

  revalidatePath("/nutrition");
}

/**
 * The inline "add new food" path (§3.1, §3.3): creates the dictionary entry
 * and the pantry line that wanted it in one submission, so a member is
 * never blocked on the dictionary being complete first.
 */
export async function addFoodAndPantryItemAction(input: {
  food: CreateFoodInput;
  quantity: number;
  location: string;
  expiresOn?: string | null;
}) {
  const food = await createFoodAction(input.food);

  await addPantryItemAction({
    foodId: food.id,
    quantity: input.quantity,
    // A brand-new food's pantry line is counted in that food's own unit.
    unit: food.unit,
    location: input.location,
    expiresOn: input.expiresOn ?? null,
  });
}

export async function updatePantryItemAction(
  itemId: string,
  input: PantryItemInput,
) {
  validatePantryItem(input);

  const member = await requireMember();
  const supabase = await createClient();

  await updatePantryItem(supabase, itemId, {
    quantity: input.quantity,
    unit: input.unit.trim(),
    location: input.location,
    expiresOn: trimToNull(input.expiresOn),
    addedBy: member.id,
  });

  revalidatePath("/nutrition");
}

export async function deletePantryItemAction(itemId: string) {
  await requireMember();
  const supabase = await createClient();

  await deletePantryItem(supabase, itemId);
  revalidatePath("/nutrition");
}

/**
 * Recipes (nutrition.md §3.3, #112). Same story as the pantry: the recipe
 * box is fixed Family, so any signed-in member may write any recipe or any
 * of its ingredient lines, and RLS is what says so.
 */
export type RecipeInput = {
  title: string;
  servings: number;
  instructions?: string | null;
  notes?: string | null;
};

function validateRecipe(input: RecipeInput) {
  if (isBlank(input.title)) throw new Error("A recipe title is required");
  if (!isServingsCount(input.servings)) {
    throw new Error("Servings must be a whole number of at least one");
  }
}

export async function createRecipeAction(
  input: RecipeInput,
): Promise<RecipeRow> {
  validateRecipe(input);

  const member = await requireMember();
  const supabase = await createClient();

  const recipe = await insertRecipe(supabase, {
    title: input.title.trim(),
    servings: input.servings,
    instructions: trimToNull(input.instructions),
    notes: trimToNull(input.notes),
    createdBy: member.id,
  });

  revalidatePath("/nutrition/recipes");
  return recipe;
}

export async function updateRecipeAction(recipeId: string, input: RecipeInput) {
  validateRecipe(input);

  await requireMember();
  const supabase = await createClient();

  await updateRecipe(supabase, recipeId, {
    title: input.title.trim(),
    servings: input.servings,
    instructions: trimToNull(input.instructions),
    notes: trimToNull(input.notes),
  });

  revalidatePath("/nutrition/recipes");
  revalidatePath(`/nutrition/recipes/${recipeId}`);
}

/**
 * Retires a recipe from the box, or puts it back. Archiving never deletes:
 * past plan entries and log provenance still point at the row.
 */
export async function setRecipeArchivedAction(
  recipeId: string,
  archived: boolean,
) {
  await requireMember();
  const supabase = await createClient();

  await setRecipeArchived(supabase, recipeId, archived);
  revalidatePath("/nutrition/recipes");
  revalidatePath(`/nutrition/recipes/${recipeId}`);
}

export async function deleteRecipeAction(recipeId: string) {
  await requireMember();
  const supabase = await createClient();

  await deleteRecipe(supabase, recipeId);
  revalidatePath("/nutrition/recipes");
}

export type RecipeIngredientInput = {
  displayText: string;
  foodId?: string | null;
  quantity?: number | null;
  unit?: string | null;
};

function validateIngredient(input: RecipeIngredientInput) {
  if (isBlank(input.displayText)) {
    throw new Error("An ingredient line needs some text");
  }
  if (input.quantity != null && !isValidAmount(input.quantity)) {
    throw new Error("Quantity must be zero or more");
  }
}

/**
 * Appends an ingredient line (§3.3). The line lands after every existing
 * one; its `food_id`, quantity and unit are optional, since "salt to
 * taste" is a legitimate line that simply contributes nothing to the
 * pantry diff or the nutrition roll-up.
 */
export async function addRecipeIngredientAction(
  recipeId: string,
  input: RecipeIngredientInput,
) {
  validateIngredient(input);

  await requireMember();
  const supabase = await createClient();

  const recipe = await getRecipe(supabase, recipeId);
  if (!recipe) throw new Error("Recipe not found");

  await insertRecipeIngredient(supabase, {
    recipeId,
    foodId: trimToNull(input.foodId),
    displayText: input.displayText.trim(),
    quantity: input.quantity ?? null,
    unit: trimToNull(input.unit),
    position: nextIngredientPosition(recipe.ingredients),
  });

  revalidatePath(`/nutrition/recipes/${recipeId}`);
}

export async function updateRecipeIngredientAction(
  recipeId: string,
  ingredientId: string,
  input: RecipeIngredientInput,
) {
  validateIngredient(input);

  await requireMember();
  const supabase = await createClient();

  await updateRecipeIngredient(supabase, ingredientId, {
    foodId: trimToNull(input.foodId),
    displayText: input.displayText.trim(),
    quantity: input.quantity ?? null,
    unit: trimToNull(input.unit),
  });

  revalidatePath(`/nutrition/recipes/${recipeId}`);
}

export async function deleteRecipeIngredientAction(
  recipeId: string,
  ingredientId: string,
) {
  await requireMember();
  const supabase = await createClient();

  await deleteRecipeIngredient(supabase, ingredientId);
  revalidatePath(`/nutrition/recipes/${recipeId}`);
}

/**
 * Nudges one ingredient line up or down a place. Positions are rewritten
 * as contiguous indices from the resulting order, so a recipe edited by
 * two members at once converges on a sane order rather than accumulating
 * gaps. A move off either end is a no-op and writes nothing.
 */
export async function moveRecipeIngredientAction(
  recipeId: string,
  ingredientId: string,
  direction: "up" | "down",
) {
  await requireMember();
  const supabase = await createClient();

  const recipe = await getRecipe(supabase, recipeId);
  if (!recipe) throw new Error("Recipe not found");

  const currentOrder = recipe.ingredients.map((line) => line.id);
  const nextOrder = moveIngredient(currentOrder, ingredientId, direction);
  if (nextOrder.every((id, index) => id === currentOrder[index])) return;

  await Promise.all(
    nextOrder.map((id, position) =>
      updateRecipeIngredientPosition(supabase, id, position),
    ),
  );

  revalidatePath(`/nutrition/recipes/${recipeId}`);
}

/**
 * Meal plan (nutrition.md §3.4, #115). Fixed Family like the rest of the
 * kitchen: any signed-in member plans, edits or removes any entry.
 */
export type MealPlanEntryInput = {
  planDate: string;
  mealSlot: string;
  recipeId?: string | null;
  freeformTitle?: string | null;
  servingsPlanned: number;
};

function validateMealPlanEntry(input: MealPlanEntryInput): {
  recipeId: string | null;
  freeformTitle: string | null;
} {
  if (isBlank(input.planDate)) throw new Error("A plan date is required");
  if (isBlank(input.mealSlot)) throw new Error("A meal slot is required");
  if (!isValidAmount(input.servingsPlanned) || input.servingsPlanned <= 0) {
    throw new Error("Servings planned must be greater than zero");
  }

  const recipeId = trimToNull(input.recipeId ?? null);
  const freeformTitle = trimToNull(input.freeformTitle ?? null);
  if ((recipeId !== null) === (freeformTitle !== null)) {
    throw new Error(
      "Pick a recipe or enter a freeform title for the meal — not both, not neither",
    );
  }

  return { recipeId, freeformTitle };
}

/**
 * Assigns a recipe (or a freeform title, for "leftovers" / "eating out") to
 * a date and meal slot (§3.4).
 */
export async function createMealPlanEntryAction(
  input: MealPlanEntryInput,
): Promise<MealPlanEntryRow> {
  const { recipeId, freeformTitle } = validateMealPlanEntry(input);

  const member = await requireMember();
  const supabase = await createClient();

  const entry = await insertMealPlanEntry(supabase, {
    planDate: input.planDate,
    mealSlot: input.mealSlot,
    recipeId,
    freeformTitle,
    servingsPlanned: input.servingsPlanned,
    createdBy: member.id,
  });

  revalidatePath("/nutrition/plan");
  return entry;
}

export async function updateMealPlanEntryAction(
  entryId: string,
  input: MealPlanEntryInput,
) {
  const { recipeId, freeformTitle } = validateMealPlanEntry(input);

  await requireMember();
  const supabase = await createClient();

  await updateMealPlanEntry(supabase, entryId, {
    planDate: input.planDate,
    mealSlot: input.mealSlot,
    recipeId,
    freeformTitle,
    servingsPlanned: input.servingsPlanned,
  });

  revalidatePath("/nutrition/plan");
}

export async function deleteMealPlanEntryAction(entryId: string) {
  await requireMember();
  const supabase = await createClient();

  await deleteMealPlanEntry(supabase, entryId);
  revalidatePath("/nutrition/plan");
}

/**
 * Marks a plan entry cooked (§3.4): sets `cooked_at` and, for a
 * recipe-linked entry, decrements the matching pantry rows by that
 * recipe's linked ingredients scaled to `servings_planned`
 * (`lib/pantry-decrement.ts`). A freeform entry ("leftovers") has no
 * recipe to decrement against, so only `cooked_at` is set. Re-marking an
 * already-cooked entry is a no-op — cooking is not undone by unmarking in
 * v1, so this guards against a double decrement from a repeat click rather
 * than modelling "un-cook".
 */
/** One pantry quantity used by a cook, for surfacing what changed. */
export type CookDecrementLine = {
  foodName: string;
  amountUsed: number;
  unit: string;
};

export async function markMealPlanEntryCookedAction(
  entryId: string,
): Promise<CookDecrementLine[]> {
  await requireMember();
  const supabase = await createClient();

  const entry = await getMealPlanEntryForCooking(supabase, entryId);
  if (!entry) throw new Error("Plan entry not found");
  if (entry.cooked_at) return [];

  let decrementLines: CookDecrementLine[] = [];

  if (entry.recipe) {
    const foodIds = entry.recipe.ingredients
      .map((line) => line.food_id)
      .filter((id): id is string => id !== null);

    const pantryRows = await getPantryItemsForFoods(supabase, foodIds);
    const pantryRowsById = new Map(pantryRows.map((row) => [row.id, row]));

    const decrements = computeCookDecrements(
      entry.recipe.servings,
      entry.servings_planned,
      entry.recipe.ingredients.map((line) => ({
        foodId: line.food_id,
        quantity: line.quantity,
        unit: line.unit,
      })),
      pantryRows.map((row) => ({
        id: row.id,
        foodId: row.food_id,
        quantity: row.quantity,
        unit: row.unit,
      })),
    );

    decrementLines = decrements.map((decrement) => {
      const before = pantryRowsById.get(decrement.pantryItemId)!;
      return {
        foodName: before.food.name,
        amountUsed: before.quantity - decrement.quantity,
        unit: before.unit,
      };
    });

    await applyPantryDecrements(supabase, decrements);
    revalidatePath("/nutrition/pantry");
  }

  await markMealPlanEntryCooked(supabase, entryId);
  revalidatePath("/nutrition/plan");
  return decrementLines;
}
