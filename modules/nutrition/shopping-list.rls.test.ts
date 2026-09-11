import { createClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it } from "vitest";

import type { Database } from "@/types/database";
import { DEFAULT_PANTRY_LOCATION } from "@/modules/nutrition/lib/locations";
import { computeShoppingListShortfalls } from "@/modules/nutrition/lib/shopping-list-generation";
import {
  getMealPlanEntriesForGeneration,
  getPantryItemForFoodUnit,
  getShoppingListItem,
  getShoppingListItems,
  insertPantryItem,
  replaceAutoShoppingListItems,
  setShoppingListItemCheckedOff,
  updatePantryItem,
} from "@/modules/nutrition/queries";

/**
 * Integration tests for the shopping-list generation and check-off/restock
 * flows (#118's two acceptance criteria that need a live plan/pantry, not
 * just the pure math already covered by
 * `lib/shopping-list-generation.test.ts`). Same live-Supabase suite as
 * `nutrition.rls.test.ts` (see its header for how to run this), but these
 * exercise business behaviour at the query layer, not RLS policy, so they
 * run entirely as the service-role client — there's no per-member
 * visibility question here, that's the other file's job.
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY);

async function createFood(name: string) {
  const { data, error } = await admin
    .from("nutrition_food")
    .insert({
      name,
      unit: "g",
      calories_per_unit: 3.8,
      protein_g_per_unit: 0.13,
      carbs_g_per_unit: 0.68,
      fat_g_per_unit: 0.07,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function createRecipeWithIngredient(
  foodId: string,
  quantity: number,
  unit: string,
) {
  const { data: recipe, error: recipeError } = await admin
    .from("nutrition_recipe")
    .insert({ title: "Pancakes", servings: 2 })
    .select("id")
    .single();
  if (recipeError) throw recipeError;

  const { error: ingredientError } = await admin
    .from("nutrition_recipe_ingredient")
    .insert({
      recipe_id: recipe.id,
      food_id: foodId,
      display_text: `${quantity} ${unit} flour`,
      quantity,
      unit,
      position: 0,
    });
  if (ingredientError) throw ingredientError;

  return recipe.id as string;
}

async function createMealPlanEntry(recipeId: string, servingsPlanned: number) {
  const { data, error } = await admin
    .from("nutrition_meal_plan_entry")
    .insert({
      plan_date: "2026-09-14",
      meal_slot: "breakfast",
      recipe_id: recipeId,
      servings_planned: servingsPlanned,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function createPantryItem(
  foodId: string,
  quantity: number,
  unit: string,
) {
  const { data, error } = await admin
    .from("nutrition_pantry_item")
    .insert({ food_id: foodId, quantity, unit, location: "pantry" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

describe("nutrition shopping-list generation and check-off", () => {
  let leftoverFoodIds: string[] = [];
  let leftoverRecipeIds: string[] = [];
  let leftoverMealPlanEntryIds: string[] = [];
  let leftoverPantryItemIds: string[] = [];

  afterEach(async () => {
    await admin.from("nutrition_shopping_list_item").delete().neq("id", "");

    for (const id of leftoverMealPlanEntryIds) {
      await admin.from("nutrition_meal_plan_entry").delete().eq("id", id);
    }
    leftoverMealPlanEntryIds = [];

    for (const id of leftoverRecipeIds) {
      await admin.from("nutrition_recipe").delete().eq("id", id);
    }
    leftoverRecipeIds = [];

    for (const id of leftoverPantryItemIds) {
      await admin.from("nutrition_pantry_item").delete().eq("id", id);
    }
    leftoverPantryItemIds = [];

    for (const id of leftoverFoodIds) {
      await admin.from("nutrition_food").delete().eq("id", id);
    }
    leftoverFoodIds = [];
  });

  it("regenerating replaces auto lines with the fresh shortfall and leaves manual lines untouched", async () => {
    const foodId = await createFood("Flour");
    leftoverFoodIds.push(foodId);
    const recipeId = await createRecipeWithIngredient(foodId, 500, "g");
    leftoverRecipeIds.push(recipeId);
    const entryId = await createMealPlanEntry(recipeId, 2);
    leftoverMealPlanEntryIds.push(entryId);
    const pantryItemId = await createPantryItem(foodId, 200, "g");
    leftoverPantryItemIds.push(pantryItemId);

    const { data: manualLine, error: manualError } = await admin
      .from("nutrition_shopping_list_item")
      .insert({ display_text: "Birthday candles", source: "manual" })
      .select("id")
      .single();
    if (manualError) throw manualError;

    const entries = await getMealPlanEntriesForGeneration(
      admin,
      "2026-09-14",
      "2026-09-14",
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

    const firstShortfalls = computeShoppingListShortfalls(plannedEntries, [
      { foodId, quantity: 200, unit: "g" },
    ]);
    await replaceAutoShoppingListItems(admin, firstShortfalls);

    let items = await getShoppingListItems(admin);
    let autoLines = items.filter((item) => item.source === "auto");
    expect(autoLines).toHaveLength(1);
    // 500g written for 2 servings, 2 planned: 500g needed, 200g on hand, 300g short.
    expect(autoLines[0].quantity).toBe(300);
    expect(items.some((item) => item.id === manualLine.id)).toBe(true);

    // Pantry restocked in between: rerunning replaces the auto line with the new shortfall.
    const secondShortfalls = computeShoppingListShortfalls(plannedEntries, [
      { foodId, quantity: 450, unit: "g" },
    ]);
    await replaceAutoShoppingListItems(admin, secondShortfalls);

    items = await getShoppingListItems(admin);
    autoLines = items.filter((item) => item.source === "auto");
    expect(autoLines).toHaveLength(1);
    expect(autoLines[0].quantity).toBe(50);

    const manualStillThere = await getShoppingListItem(admin, manualLine.id);
    expect(manualStillThere?.display_text).toBe("Birthday candles");
  });

  it("checking off an auto line restocks the matching pantry row", async () => {
    const foodId = await createFood("Eggs");
    leftoverFoodIds.push(foodId);
    const pantryItemId = await createPantryItem(foodId, 3, "each");
    leftoverPantryItemIds.push(pantryItemId);

    const { data: item, error } = await admin
      .from("nutrition_shopping_list_item")
      .insert({
        food_id: foodId,
        display_text: "6 each Eggs",
        quantity: 6,
        unit: "each",
        source: "auto",
      })
      .select("id")
      .single();
    if (error) throw error;

    const pantryRow = await getPantryItemForFoodUnit(admin, foodId, "each");
    expect(pantryRow?.id).toBe(pantryItemId);

    await updatePantryItem(admin, pantryRow!.id, {
      quantity: pantryRow!.quantity + 6,
      unit: pantryRow!.unit,
      location: pantryRow!.location,
      expiresOn: pantryRow!.expires_on,
      addedBy: pantryRow!.added_by ?? "00000000-0000-0000-0000-000000000000",
    });
    await setShoppingListItemCheckedOff(admin, item.id);

    const { data: restocked } = await admin
      .from("nutrition_pantry_item")
      .select("quantity")
      .eq("id", pantryItemId)
      .single();
    expect(restocked?.quantity).toBe(9);

    const checkedOff = await getShoppingListItem(admin, item.id);
    expect(checkedOff?.checked_off).toBe(true);
  });

  it("checking off an auto line with no matching pantry row creates one", async () => {
    const foodId = await createFood("Butter");
    leftoverFoodIds.push(foodId);

    const { data: item, error } = await admin
      .from("nutrition_shopping_list_item")
      .insert({
        food_id: foodId,
        display_text: "200 g Butter",
        quantity: 200,
        unit: "g",
        source: "auto",
      })
      .select("id")
      .single();
    if (error) throw error;

    const pantryRow = await getPantryItemForFoodUnit(admin, foodId, "g");
    expect(pantryRow).toBeNull();

    const created = await insertPantryItem(admin, {
      foodId,
      quantity: 200,
      unit: "g",
      location: DEFAULT_PANTRY_LOCATION,
      expiresOn: null,
      addedBy: "00000000-0000-0000-0000-000000000000",
    });
    leftoverPantryItemIds.push(created.id);
    await setShoppingListItemCheckedOff(admin, item.id);

    const { data: newRow } = await admin
      .from("nutrition_pantry_item")
      .select("quantity, unit, location")
      .eq("id", created.id)
      .single();
    expect(newRow?.quantity).toBe(200);
    expect(newRow?.location).toBe(DEFAULT_PANTRY_LOCATION);

    const checkedOff = await getShoppingListItem(admin, item.id);
    expect(checkedOff?.checked_off).toBe(true);
  });
});
