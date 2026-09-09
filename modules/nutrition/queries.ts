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
