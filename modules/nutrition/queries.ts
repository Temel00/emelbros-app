import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type FoodRow = Database["public"]["Tables"]["nutrition_food"]["Row"];
export type PantryItemRow =
  Database["public"]["Tables"]["nutrition_pantry_item"]["Row"];

/** A pantry line with the food it points at, joined in one round trip. */
export type PantryItemWithFood = PantryItemRow & { food: FoodRow };

/**
 * The nutrition query layer (ADR-0009): every function unwraps
 * `{ data, error }` and throws on `error`. RLS (nutrition.md §2) is what
 * enforces visibility and write rights — these functions never re-check
 * either. Both tables here are fixed Family, so there is no member id to
 * filter by: a signed-in caller sees the whole kitchen.
 */

// === nutrition_food ==================================================

/** The whole food dictionary, alphabetical — the pantry form's food picker. */
export async function getFoods(
  supabase: SupabaseClient<Database>,
): Promise<FoodRow[]> {
  const { data, error } = await supabase
    .from("nutrition_food")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function insertFood(
  supabase: SupabaseClient<Database>,
  food: {
    name: string;
    brand: string | null;
    barcode: string | null;
    unit: string;
    caloriesPerUnit: number;
    proteinGPerUnit: number;
    carbsGPerUnit: number;
    fatGPerUnit: number;
    fiberGPerUnit: number | null;
    createdBy: string;
  },
): Promise<FoodRow> {
  const { data, error } = await supabase
    .from("nutrition_food")
    .insert({
      name: food.name,
      brand: food.brand,
      barcode: food.barcode,
      unit: food.unit,
      calories_per_unit: food.caloriesPerUnit,
      protein_g_per_unit: food.proteinGPerUnit,
      carbs_g_per_unit: food.carbsGPerUnit,
      fat_g_per_unit: food.fatGPerUnit,
      fiber_g_per_unit: food.fiberGPerUnit,
      created_by: food.createdBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// === nutrition_pantry_item ===========================================

/**
 * Every pantry line with its food (nutrition.md §3.2). Ordered by soonest
 * expiry first — nulls last, so dated items surface above undated staples —
 * then by food name for a stable read. Grouping by `location` is a render
 * concern, done in the view.
 */
export async function getPantryItems(
  supabase: SupabaseClient<Database>,
): Promise<PantryItemWithFood[]> {
  const { data, error } = await supabase
    .from("nutrition_pantry_item")
    .select("*, food:nutrition_food(*)")
    .order("expires_on", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as PantryItemWithFood[];
}

export async function insertPantryItem(
  supabase: SupabaseClient<Database>,
  item: {
    foodId: string;
    quantity: number;
    unit: string;
    location: string;
    expiresOn: string | null;
    addedBy: string;
  },
): Promise<PantryItemRow> {
  const { data, error } = await supabase
    .from("nutrition_pantry_item")
    .insert({
      food_id: item.foodId,
      quantity: item.quantity,
      unit: item.unit,
      location: item.location,
      expires_on: item.expiresOn,
      added_by: item.addedBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Edits a pantry line. `added_by` is rewritten to the editing member: the
 * column is "last member to touch this row" (§4), not the creator, since
 * the row itself is unowned and anyone may adjust a count.
 */
export async function updatePantryItem(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: {
    quantity: number;
    unit: string;
    location: string;
    expiresOn: string | null;
    addedBy: string;
  },
): Promise<void> {
  const { error } = await supabase
    .from("nutrition_pantry_item")
    .update({
      quantity: patch.quantity,
      unit: patch.unit,
      location: patch.location,
      expires_on: patch.expiresOn,
      added_by: patch.addedBy,
    })
    .eq("id", id);

  if (error) throw error;
}

export async function deletePantryItem(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("nutrition_pantry_item")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// === nutrition_recipe / nutrition_recipe_ingredient ==================

export type RecipeRow = Database["public"]["Tables"]["nutrition_recipe"]["Row"];
export type RecipeIngredientRow =
  Database["public"]["Tables"]["nutrition_recipe_ingredient"]["Row"];

/**
 * An ingredient line with the dictionary food it points at, or `null` for
 * an unlinked line like "salt to taste" (nutrition.md §3.3).
 */
export type RecipeIngredientWithFood = RecipeIngredientRow & {
  food: FoodRow | null;
};

/** A recipe with its ingredient lines in `position` order. */
export type RecipeWithIngredients = RecipeRow & {
  ingredients: RecipeIngredientWithFood[];
};

/**
 * The recipe box (nutrition.md §3.3): active recipes only, alphabetical.
 * Archiving is not deletion — an archived recipe is still referenced by
 * past plan entries and log provenance — so it is filtered out here rather
 * than removed.
 */
export async function getRecipes(
  supabase: SupabaseClient<Database>,
): Promise<RecipeRow[]> {
  const { data, error } = await supabase
    .from("nutrition_recipe")
    .select("*")
    .is("archived_at", null)
    .order("title", { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * One recipe with its ordered ingredient lines and each line's food, in a
 * single round trip. Returns `null` when the id matches nothing the caller
 * can see — an archived recipe still resolves, since this is the detail
 * view an archived recipe is read through.
 */
export async function getRecipe(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<RecipeWithIngredients | null> {
  const { data, error } = await supabase
    .from("nutrition_recipe")
    .select(
      "*, ingredients:nutrition_recipe_ingredient(*, food:nutrition_food(*))",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const recipe = data as unknown as RecipeWithIngredients;
  return {
    ...recipe,
    ingredients: [...recipe.ingredients].sort(
      (a, b) => a.position - b.position,
    ),
  };
}

export async function insertRecipe(
  supabase: SupabaseClient<Database>,
  recipe: {
    title: string;
    servings: number;
    instructions: string | null;
    notes: string | null;
    createdBy: string;
  },
): Promise<RecipeRow> {
  const { data, error } = await supabase
    .from("nutrition_recipe")
    .insert({
      title: recipe.title,
      servings: recipe.servings,
      instructions: recipe.instructions,
      notes: recipe.notes,
      created_by: recipe.createdBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateRecipe(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: {
    title: string;
    servings: number;
    instructions: string | null;
    notes: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from("nutrition_recipe")
    .update({
      title: patch.title,
      servings: patch.servings,
      instructions: patch.instructions,
      notes: patch.notes,
    })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Retires a recipe from the box, or restores it. `archived_at` is a
 * timestamp rather than a flag so "when did this leave the box" survives.
 */
export async function setRecipeArchived(
  supabase: SupabaseClient<Database>,
  id: string,
  archived: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("nutrition_recipe")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id);

  if (error) throw error;
}

/** Deletes a recipe outright; ingredient lines cascade with it. */
export async function deleteRecipe(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("nutrition_recipe")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function insertRecipeIngredient(
  supabase: SupabaseClient<Database>,
  ingredient: {
    recipeId: string;
    foodId: string | null;
    displayText: string;
    quantity: number | null;
    unit: string | null;
    position: number;
  },
): Promise<RecipeIngredientRow> {
  const { data, error } = await supabase
    .from("nutrition_recipe_ingredient")
    .insert({
      recipe_id: ingredient.recipeId,
      food_id: ingredient.foodId,
      display_text: ingredient.displayText,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      position: ingredient.position,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateRecipeIngredient(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: {
    foodId: string | null;
    displayText: string;
    quantity: number | null;
    unit: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from("nutrition_recipe_ingredient")
    .update({
      food_id: patch.foodId,
      display_text: patch.displayText,
      quantity: patch.quantity,
      unit: patch.unit,
    })
    .eq("id", id);

  if (error) throw error;
}

/** Writes one line's `position`; a reorder calls this once per line. */
export async function updateRecipeIngredientPosition(
  supabase: SupabaseClient<Database>,
  id: string,
  position: number,
): Promise<void> {
  const { error } = await supabase
    .from("nutrition_recipe_ingredient")
    .update({ position })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteRecipeIngredient(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("nutrition_recipe_ingredient")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// === nutrition_meal_plan_entry ========================================

export type MealPlanEntryRow =
  Database["public"]["Tables"]["nutrition_meal_plan_entry"]["Row"];

/** A plan entry with the recipe it points at, or `null` for a freeform one. */
export type MealPlanEntryWithRecipe = MealPlanEntryRow & {
  recipe: RecipeRow | null;
};

/**
 * Plan entries for a date range, inclusive (nutrition.md §3.4) — the week
 * calendar's read. Ordered by date, then by creation so same-day entries
 * stay in the order they were planned; grouping by `meal_slot` is a render
 * concern, done in the view (mirrors `getPantryItems`' location grouping).
 */
export async function getMealPlanEntries(
  supabase: SupabaseClient<Database>,
  startDate: string,
  endDate: string,
): Promise<MealPlanEntryWithRecipe[]> {
  const { data, error } = await supabase
    .from("nutrition_meal_plan_entry")
    .select("*, recipe:nutrition_recipe(*)")
    .gte("plan_date", startDate)
    .lte("plan_date", endDate)
    .order("plan_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as MealPlanEntryWithRecipe[];
}

export async function insertMealPlanEntry(
  supabase: SupabaseClient<Database>,
  entry: {
    planDate: string;
    mealSlot: string;
    recipeId: string | null;
    freeformTitle: string | null;
    servingsPlanned: number;
    createdBy: string;
  },
): Promise<MealPlanEntryRow> {
  const { data, error } = await supabase
    .from("nutrition_meal_plan_entry")
    .insert({
      plan_date: entry.planDate,
      meal_slot: entry.mealSlot,
      recipe_id: entry.recipeId,
      freeform_title: entry.freeformTitle,
      servings_planned: entry.servingsPlanned,
      created_by: entry.createdBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMealPlanEntry(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: {
    planDate: string;
    mealSlot: string;
    recipeId: string | null;
    freeformTitle: string | null;
    servingsPlanned: number;
  },
): Promise<void> {
  const { error } = await supabase
    .from("nutrition_meal_plan_entry")
    .update({
      plan_date: patch.planDate,
      meal_slot: patch.mealSlot,
      recipe_id: patch.recipeId,
      freeform_title: patch.freeformTitle,
      servings_planned: patch.servingsPlanned,
    })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteMealPlanEntry(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("nutrition_meal_plan_entry")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

type RecipeIngredientForCooking = Pick<
  RecipeIngredientRow,
  "food_id" | "quantity" | "unit"
>;

export type MealPlanEntryForCooking = MealPlanEntryRow & {
  recipe: (RecipeRow & { ingredients: RecipeIngredientForCooking[] }) | null;
};

/**
 * One plan entry with just enough of its recipe — servings and each
 * ingredient line's food/quantity/unit — to compute the cook decrement
 * (`lib/pantry-decrement.ts`). `null` recipe means a freeform entry: cooking
 * it sets `cooked_at` with nothing to decrement against.
 */
export async function getMealPlanEntryForCooking(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<MealPlanEntryForCooking | null> {
  const { data, error } = await supabase
    .from("nutrition_meal_plan_entry")
    .select(
      "*, recipe:nutrition_recipe(*, ingredients:nutrition_recipe_ingredient(food_id, quantity, unit))",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as MealPlanEntryForCooking | null;
}

/**
 * Every pantry row for a set of foods — the cook decrement's match pool.
 * Joins the food name so a cook decrement can be surfaced by name ("used 2
 * cups flour") without a second round trip.
 */
export async function getPantryItemsForFoods(
  supabase: SupabaseClient<Database>,
  foodIds: string[],
): Promise<PantryItemWithFood[]> {
  if (foodIds.length === 0) return [];

  const { data, error } = await supabase
    .from("nutrition_pantry_item")
    .select("*, food:nutrition_food(*)")
    .in("food_id", foodIds);

  if (error) throw error;
  return data as PantryItemWithFood[];
}

/** Writes the decrements `computeCookDecrements` returned, one row each. */
export async function applyPantryDecrements(
  supabase: SupabaseClient<Database>,
  decrements: { pantryItemId: string; quantity: number }[],
): Promise<void> {
  for (const decrement of decrements) {
    const { error } = await supabase
      .from("nutrition_pantry_item")
      .update({ quantity: decrement.quantity })
      .eq("id", decrement.pantryItemId);

    if (error) throw error;
  }
}

export async function markMealPlanEntryCooked(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("nutrition_meal_plan_entry")
    .update({ cooked_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
