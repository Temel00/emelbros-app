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
  computeShoppingListShortfalls,
  type ShoppingListShortfall,
} from "@/modules/nutrition/lib/shopping-list-generation";
import { computeLogMacros } from "@/modules/nutrition/lib/macro-computation";
import { DEFAULT_PANTRY_LOCATION } from "@/modules/nutrition/lib/locations";
import {
  applyPantryDecrements,
  deleteLogEntry,
  deleteMealPlanEntry,
  deletePantryItem,
  deleteRecipe,
  deleteRecipeIngredient,
  deleteShoppingListItem,
  getFoodsByIds,
  getLogEntry,
  getMealPlanEntriesForGeneration,
  getMealPlanEntryForCooking,
  getPantryItemForFoodUnit,
  getPantryItemsForFoods,
  getRecipe,
  getShoppingListItem,
  insertFood,
  insertLogEntry,
  insertMealPlanEntry,
  insertManualShoppingListItem,
  insertPantryItem,
  insertRecipe,
  insertRecipeIngredient,
  markMealPlanEntryCooked,
  replaceAutoShoppingListItems,
  setRecipeArchived,
  setShoppingListItemCheckedOff,
  updateLogEntry,
  updateMealPlanEntry,
  updatePantryItem,
  updateRecipe,
  updateRecipeIngredient,
  updateRecipeIngredientPosition,
  updateShoppingListItem,
  type FoodRow,
  type LogEntryRow,
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

/**
 * The shortfall computation shared by generation and its preview (§3.4):
 * sums the range's planned recipes' linked ingredients, scaled to servings
 * planned, and subtracts the pantry (`lib/shopping-list-generation.ts`).
 * Read-only — callers decide whether to write the result.
 */
async function computeShortfallsForRange(
  supabase: Awaited<ReturnType<typeof createClient>>,
  startDate: string,
  endDate: string,
) {
  const entries = await getMealPlanEntriesForGeneration(
    supabase,
    startDate,
    endDate,
  );

  const plannedEntries = entries
    .filter((entry) => entry.recipe !== null)
    .map((entry) => ({
      recipeServings: entry.recipe!.servings,
      servingsPlanned: entry.servings_planned,
      lines: entry.recipe!.ingredients.map((line) => ({
        foodId: line.food_id,
        foodName: line.food?.name ?? "",
        quantity: line.quantity,
        unit: line.unit,
      })),
    }));

  const foodIds = plannedEntries.flatMap((entry) =>
    entry.lines
      .map((line) => line.foodId)
      .filter((id): id is string => id !== null),
  );

  const pantryRows = await getPantryItemsForFoods(supabase, foodIds);

  return computeShoppingListShortfalls(
    plannedEntries,
    pantryRows.map((row) => ({
      foodId: row.food_id,
      quantity: row.quantity,
      unit: row.unit,
    })),
  );
}

/**
 * Regenerates the shopping list's `auto` lines for a date range (§3.4),
 * replacing every existing `auto` line with the freshly computed
 * shortfall. `manual` lines are untouched — regeneration only ever
 * replaces the lines it itself wrote.
 */
export async function generateShoppingListAction(
  startDate: string,
  endDate: string,
) {
  await requireMember();
  const supabase = await createClient();

  const shortfalls = await computeShortfallsForRange(
    supabase,
    startDate,
    endDate,
  );

  await replaceAutoShoppingListItems(
    supabase,
    shortfalls.map((shortfall) => ({
      foodId: shortfall.foodId,
      displayText: shortfall.displayText,
      quantity: shortfall.quantity,
      unit: shortfall.unit,
    })),
  );

  revalidatePath("/nutrition/shopping-list");
}

/**
 * Read-only counterpart to {@link generateShoppingListAction}: computes the
 * same shortfalls but never writes them, so the UI can preview what
 * generating would change (a diff against the current `auto` lines) before
 * the member confirms.
 */
export async function previewShoppingListGenerationAction(
  startDate: string,
  endDate: string,
): Promise<ShoppingListShortfall[]> {
  await requireMember();
  const supabase = await createClient();

  return computeShortfallsForRange(supabase, startDate, endDate);
}

export type AddManualShoppingListItemInput = {
  foodId?: string | null;
  displayText: string;
  quantity?: number | null;
  unit?: string | null;
};

function validateShoppingListItem(input: {
  displayText: string;
  quantity?: number | null;
}) {
  if (isBlank(input.displayText)) throw new Error("Item text is required");
  if (
    input.quantity !== undefined &&
    input.quantity !== null &&
    !isValidAmount(input.quantity)
  )
    throw new Error("Quantity must be a positive number");
}

export async function addManualShoppingListItemAction(
  input: AddManualShoppingListItemInput,
) {
  validateShoppingListItem(input);
  const member = await requireMember();
  const supabase = await createClient();

  await insertManualShoppingListItem(supabase, {
    foodId: input.foodId ?? null,
    displayText: input.displayText,
    quantity: input.quantity ?? null,
    unit: trimToNull(input.unit ?? null),
    addedBy: member.id,
  });

  revalidatePath("/nutrition/shopping-list");
}

export type UpdateManualShoppingListItemInput = {
  foodId?: string | null;
  displayText: string;
  quantity?: number | null;
  unit?: string | null;
};

export async function updateManualShoppingListItemAction(
  itemId: string,
  input: UpdateManualShoppingListItemInput,
) {
  validateShoppingListItem(input);
  await requireMember();
  const supabase = await createClient();

  await updateShoppingListItem(supabase, itemId, {
    foodId: input.foodId ?? null,
    displayText: input.displayText,
    quantity: input.quantity ?? null,
    unit: trimToNull(input.unit ?? null),
  });

  revalidatePath("/nutrition/shopping-list");
}

export async function deleteShoppingListItemAction(itemId: string) {
  await requireMember();
  const supabase = await createClient();

  await deleteShoppingListItem(supabase, itemId);
  revalidatePath("/nutrition/shopping-list");
}

/**
 * Checks off a line (§3.4): if it's an `auto` line linked to a food, its
 * quantity restocks the matching pantry row (same food, same unit — no
 * conversion, §8; first match wins, `lib/pantry-decrement.ts`'s own rule),
 * creating one at the default location if none exists. Re-checking an
 * already-checked line is a no-op, guarding against a double restock from
 * a repeat click.
 */
export async function checkOffShoppingListItemAction(itemId: string) {
  const member = await requireMember();
  const supabase = await createClient();

  const item = await getShoppingListItem(supabase, itemId);
  if (!item) throw new Error("Shopping list item not found");
  if (item.checked_off) return;

  if (item.food_id && item.unit && item.quantity !== null) {
    const pantryRow = await getPantryItemForFoodUnit(
      supabase,
      item.food_id,
      item.unit,
    );

    if (pantryRow) {
      await updatePantryItem(supabase, pantryRow.id, {
        quantity: pantryRow.quantity + item.quantity,
        unit: pantryRow.unit,
        location: pantryRow.location,
        expiresOn: pantryRow.expires_on,
        addedBy: pantryRow.added_by ?? member.id,
      });
    } else {
      await insertPantryItem(supabase, {
        foodId: item.food_id,
        quantity: item.quantity,
        unit: item.unit,
        location: DEFAULT_PANTRY_LOCATION,
        expiresOn: null,
        addedBy: member.id,
      });
    }

    revalidatePath("/nutrition/pantry");
  }

  await setShoppingListItemCheckedOff(supabase, itemId);
  revalidatePath("/nutrition/shopping-list");
}

// === Logging (§3.5, #121) ===============================================
// Three ways in. Each computes its macros with `computeLogMacros`
// (`lib/macro-computation.ts`) and writes the result as a snapshot —
// `nutrition_log` never live-joins `nutrition_food`/`nutrition_recipe` for
// its numbers, so editing a food's macros later cannot change what these
// actions already wrote. Fixed Private (§2, §10): RLS scopes every one of
// these to the caller's own rows, so unlike the Family tables above there's
// no other member's row an action here could ever touch.

function toFoodMacroRates(food: FoodRow) {
  return {
    id: food.id,
    unit: food.unit,
    caloriesPerUnit: food.calories_per_unit,
    proteinGPerUnit: food.protein_g_per_unit,
    carbsGPerUnit: food.carbs_g_per_unit,
    fatGPerUnit: food.fat_g_per_unit,
  };
}

function validateOptionalMacros(macros: {
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
}) {
  const values = [macros.calories, macros.proteinG, macros.carbsG, macros.fatG];
  if (values.some((value) => value != null && !isValidAmount(value))) {
    throw new Error("Nutrition facts must be zero or more");
  }
}

/**
 * Logs a cooked plan entry (§3.5): the recipe's per-serving macros, scaled
 * to a portion size that defaults to how much was planned but is
 * adjustable at log time. Only takeable once the entry is marked cooked
 * (`markMealPlanEntryCookedAction`) — that's what the plan UI gates the
 * "log it" tap behind.
 */
export type LogCookedMealInput = {
  loggedAt: string;
  portionServings: number;
  note?: string | null;
};

export async function logCookedMealEntryAction(
  entryId: string,
  input: LogCookedMealInput,
): Promise<LogEntryRow> {
  if (!isValidAmount(input.portionServings) || input.portionServings <= 0) {
    throw new Error("Portion must be greater than zero");
  }

  const member = await requireMember();
  const supabase = await createClient();

  const entry = await getMealPlanEntryForCooking(supabase, entryId);
  if (!entry) throw new Error("Plan entry not found");
  if (!entry.cooked_at) {
    throw new Error("Mark this meal cooked before logging it");
  }
  if (!entry.recipe) {
    throw new Error("This plan entry has no recipe to log from");
  }

  const foodIds = entry.recipe.ingredients
    .map((line) => line.food_id)
    .filter((id): id is string => id !== null);
  const foods = await getFoodsByIds(supabase, foodIds);

  const macros = computeLogMacros({
    kind: "cookedMeal",
    recipeServings: entry.recipe.servings,
    portionServings: input.portionServings,
    ingredients: entry.recipe.ingredients.map((line) => ({
      foodId: line.food_id,
      quantity: line.quantity,
      unit: line.unit,
    })),
    foods: foods.map(toFoodMacroRates),
  });

  const logEntry = await insertLogEntry(supabase, {
    memberId: member.id,
    loggedAt: input.loggedAt,
    foodId: null,
    recipeId: entry.recipe.id,
    description: null,
    quantity: input.portionServings,
    unit: "serving",
    calories: macros.calories,
    proteinG: macros.proteinG,
    carbsG: macros.carbsG,
    fatG: macros.fatG,
    note: trimToNull(input.note ?? null),
  });

  revalidatePath("/nutrition/log");
  return logEntry;
}

/**
 * Logs from the food dictionary (§3.5): a quantity of a chosen food:
 * macros compute from that food's per-unit values, in the food's own unit.
 */
export type LogFoodInput = {
  foodId: string;
  loggedAt: string;
  quantity: number;
  note?: string | null;
};

export async function logFoodEntryAction(
  input: LogFoodInput,
): Promise<LogEntryRow> {
  if (!isValidAmount(input.quantity) || input.quantity <= 0) {
    throw new Error("Quantity must be greater than zero");
  }

  const member = await requireMember();
  const supabase = await createClient();

  const [food] = await getFoodsByIds(supabase, [input.foodId]);
  if (!food) throw new Error("Food not found");

  const macros = computeLogMacros({
    kind: "food",
    quantity: input.quantity,
    food: toFoodMacroRates(food),
  });

  const logEntry = await insertLogEntry(supabase, {
    memberId: member.id,
    loggedAt: input.loggedAt,
    foodId: food.id,
    recipeId: null,
    description: null,
    quantity: input.quantity,
    unit: food.unit,
    calories: macros.calories,
    proteinG: macros.proteinG,
    carbsG: macros.carbsG,
    fatG: macros.fatG,
    note: trimToNull(input.note ?? null),
  });

  revalidatePath("/nutrition/log");
  return logEntry;
}

/**
 * Logs freeform (§3.5): a description, with an optional rough macro
 * estimate entered directly — there's nothing to compute against, so
 * `computeLogMacros` just passes the numbers through.
 */
export type LogFreeformInput = {
  loggedAt: string;
  description: string;
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  note?: string | null;
};

export async function logFreeformEntryAction(
  input: LogFreeformInput,
): Promise<LogEntryRow> {
  if (isBlank(input.description)) {
    throw new Error("Description is required");
  }

  const macros = computeLogMacros({
    kind: "freeform",
    calories: input.calories ?? null,
    proteinG: input.proteinG ?? null,
    carbsG: input.carbsG ?? null,
    fatG: input.fatG ?? null,
  });
  validateOptionalMacros(macros);

  const member = await requireMember();
  const supabase = await createClient();

  const logEntry = await insertLogEntry(supabase, {
    memberId: member.id,
    loggedAt: input.loggedAt,
    foodId: null,
    recipeId: null,
    description: input.description.trim(),
    quantity: null,
    unit: null,
    calories: macros.calories,
    proteinG: macros.proteinG,
    carbsG: macros.carbsG,
    fatG: macros.fatG,
    note: trimToNull(input.note ?? null),
  });

  revalidatePath("/nutrition/log");
  return logEntry;
}

export type UpdateLogEntryInput = {
  loggedAt: string;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  note?: string | null;
};

/**
 * Edits a logged entry's own fields directly — this never re-derives
 * macros from a linked food/recipe (there is no live join to re-derive
 * from), so it can't be used to "fix up" an entry by re-syncing it against
 * a food's current values.
 */
export async function updateLogEntryAction(
  id: string,
  input: UpdateLogEntryInput,
): Promise<void> {
  if (input.quantity != null && !isValidAmount(input.quantity)) {
    throw new Error("Quantity must be zero or more");
  }
  validateOptionalMacros(input);

  await requireMember();
  const supabase = await createClient();

  await updateLogEntry(supabase, id, {
    loggedAt: input.loggedAt,
    description: trimToNull(input.description),
    quantity: input.quantity,
    unit: input.unit,
    calories: input.calories,
    proteinG: input.proteinG,
    carbsG: input.carbsG,
    fatG: input.fatG,
    note: trimToNull(input.note ?? null),
  });

  revalidatePath("/nutrition/log");
}

export async function deleteLogEntryAction(id: string): Promise<void> {
  await requireMember();
  const supabase = await createClient();

  await deleteLogEntry(supabase, id);
  revalidatePath("/nutrition/log");
}

/**
 * "Log again": an exact duplicate of an existing entry's snapshot, only the
 * id and timestamp changed. Never recomputes macros from the linked food or
 * recipe — that would break the snapshot guarantee above for the one path
 * (repeat) most likely to be used on stale-by-then links. Judgment call:
 * this is a new action rather than re-invoking the type-specific logging
 * actions above, since the real schema keeps no `plan_entry_id` to replay a
 * cooked-meal entry through `logCookedMealEntryAction`.
 */
export async function repeatLogEntryAction(
  id: string,
  loggedAt: string,
): Promise<LogEntryRow> {
  await requireMember();
  const supabase = await createClient();

  const source = await getLogEntry(supabase, id);
  if (!source) throw new Error("Entry not found");

  const logEntry = await insertLogEntry(supabase, {
    memberId: source.member_id,
    loggedAt,
    foodId: source.food_id,
    recipeId: source.recipe_id,
    description: source.description,
    quantity: source.quantity,
    unit: source.unit,
    calories: source.calories,
    proteinG: source.protein_g,
    carbsG: source.carbs_g,
    fatG: source.fat_g,
    note: source.note,
  });

  revalidatePath("/nutrition/log");
  return logEntry;
}
