import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/types/database";

/**
 * RLS integration tests for the nutrition module (nutrition.md §2, §10;
 * acceptance criteria of #104 and #112, testing conventions #13). These hit a live
 * local Supabase stack (`supabase start`) rather than mocks, so — per the
 * `**\/*.rls.test.{ts,tsx}` exclude in vitest.config.ts — they are kept out
 * of the default `vitest run` and are run explicitly once a local stack is
 * available:
 *
 *   supabase start
 *   SUPABASE_SERVICE_ROLE_KEY=<local service_role key> \
 *   SUPABASE_ANON_KEY=<local anon key> \
 *   vitest run --config vitest.rls.config.ts
 *
 * What's under test is the fixed-Family template on the food, pantry and
 * recipe tables: any signed-in member reads and writes every row (the
 * kitchen is unowned), and signed out, none of them exist. The
 * `bystander` member — who created nothing — is the one who proves it,
 * since there is no owner clause to fall back on. `nutrition_recipe_ingredient`
 * is the module's first inherited table, so it is tested for reachability
 * through its parent recipe rather than for a policy of its own.
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const PASSWORD = "nutrition-rls-test-password-1!";

const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY);

type Member = { id: string; client: SupabaseClient<Database> };

async function createMember(label: string): Promise<Member> {
  const email = `nutrition-rls-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;

  const client = createClient<Database>(SUPABASE_URL, ANON_KEY);
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (signInError) throw signInError;

  return { id: data.user.id, client };
}

/** Inserts a dictionary food via the service-role client, bypassing RLS. */
async function createFood(creator: Member) {
  const { data, error } = await admin
    .from("nutrition_food")
    .insert({
      name: `Oats ${Math.random().toString(36).slice(2)}`,
      unit: "g",
      calories_per_unit: 3.8,
      protein_g_per_unit: 0.13,
      carbs_g_per_unit: 0.68,
      fat_g_per_unit: 0.07,
      created_by: creator.id,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** Inserts a pantry line via the service-role client, bypassing RLS. */
async function createPantryItem(foodId: string, creator: Member) {
  const { data, error } = await admin
    .from("nutrition_pantry_item")
    .insert({
      food_id: foodId,
      quantity: 500,
      unit: "g",
      location: "pantry",
      added_by: creator.id,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** Inserts a recipe via the service-role client, bypassing RLS. */
async function createRecipe(creator: Member) {
  const { data, error } = await admin
    .from("nutrition_recipe")
    .insert({
      title: `Porridge ${Math.random().toString(36).slice(2)}`,
      servings: 2,
      instructions: "Simmer the oats.",
      created_by: creator.id,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/**
 * Inserts an ingredient line via the service-role client, bypassing RLS.
 * `foodId` is optional because an unlinked line ("salt to taste") is a
 * first-class shape, not a degenerate one (nutrition.md §3.3).
 */
async function createIngredient(recipeId: string, foodId?: string) {
  const { data, error } = await admin
    .from("nutrition_recipe_ingredient")
    .insert({
      recipe_id: recipeId,
      food_id: foodId ?? null,
      display_text: "2 cloves garlic, minced",
      quantity: foodId ? 2 : null,
      unit: foodId ? "each" : null,
      position: 0,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

describe("nutrition RLS", () => {
  let cook: Member;
  let bystander: Member;
  // Signed-out client: the anon key with no session at all.
  const anonymous = createClient<Database>(SUPABASE_URL, ANON_KEY);
  let leftoverFoodIds: string[] = [];
  let leftoverRecipeIds: string[] = [];

  beforeAll(async () => {
    cook = await createMember("cook");
    bystander = await createMember("bystander");
  });

  afterEach(async () => {
    // Ingredient lines cascade with their recipe, and pantry lines with
    // their food, so deleting the two parents is enough. Recipes go first:
    // an ingredient line holds a food reference that is only set to null,
    // not cascaded, so the food outlives it either way.
    for (const id of leftoverRecipeIds) {
      await admin.from("nutrition_recipe").delete().eq("id", id);
    }
    leftoverRecipeIds = [];

    for (const id of leftoverFoodIds) {
      await admin.from("nutrition_food").delete().eq("id", id);
    }
    leftoverFoodIds = [];
  });

  afterAll(async () => {
    for (const member of [cook, bystander]) {
      await admin.auth.admin.deleteUser(member.id);
    }
  });

  // === nutrition_food ================================================

  it("lets any signed-in member add a food to the dictionary", async () => {
    const { data, error } = await cook.client
      .from("nutrition_food")
      .insert({
        name: "Peanut butter",
        unit: "g",
        calories_per_unit: 6,
        protein_g_per_unit: 0.25,
        carbs_g_per_unit: 0.2,
        fat_g_per_unit: 0.5,
        created_by: cook.id,
      })
      .select("id")
      .single();

    expect(error).toBeNull();
    if (data) leftoverFoodIds.push(data.id);
  });

  it("lets a member who added nothing read the dictionary (fixed Family)", async () => {
    const foodId = await createFood(cook);
    leftoverFoodIds.push(foodId);

    const { data, error } = await bystander.client
      .from("nutrition_food")
      .select("id")
      .eq("id", foodId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.id).toBe(foodId);
  });

  it("lets a member correct a food someone else added", async () => {
    const foodId = await createFood(cook);
    leftoverFoodIds.push(foodId);

    const { error, count } = await bystander.client
      .from("nutrition_food")
      .update({ calories_per_unit: 4 }, { count: "exact" })
      .eq("id", foodId);

    expect(error).toBeNull();
    expect(count).toBe(1);
  });

  it("lets a member delete a food someone else added", async () => {
    const foodId = await createFood(cook);

    const { error, count } = await bystander.client
      .from("nutrition_food")
      .delete({ count: "exact" })
      .eq("id", foodId);

    expect(error).toBeNull();
    expect(count).toBe(1);
  });

  it("hides the dictionary from a signed-out caller", async () => {
    const foodId = await createFood(cook);
    leftoverFoodIds.push(foodId);

    const { data, error } = await anonymous
      .from("nutrition_food")
      .select("id")
      .eq("id", foodId);

    // RLS filters rather than erroring: the row simply isn't there.
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("blocks a signed-out caller from adding a food", async () => {
    const { data, error } = await anonymous
      .from("nutrition_food")
      .insert({
        name: "Contraband",
        unit: "g",
        calories_per_unit: 1,
        protein_g_per_unit: 0,
        carbs_g_per_unit: 0,
        fat_g_per_unit: 0,
      })
      .select("id")
      .single();

    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  // === nutrition_pantry_item =========================================

  it("lets any signed-in member add a pantry line", async () => {
    const foodId = await createFood(cook);
    leftoverFoodIds.push(foodId);

    const { error } = await bystander.client
      .from("nutrition_pantry_item")
      .insert({
        food_id: foodId,
        quantity: 200,
        unit: "g",
        location: "fridge",
        added_by: bystander.id,
      })
      .select("id")
      .single();

    expect(error).toBeNull();
  });

  it("lets a member who added nothing read the pantry (fixed Family)", async () => {
    const foodId = await createFood(cook);
    leftoverFoodIds.push(foodId);
    const itemId = await createPantryItem(foodId, cook);

    const { data, error } = await bystander.client
      .from("nutrition_pantry_item")
      .select("id")
      .eq("id", itemId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.id).toBe(itemId);
  });

  it("lets a member adjust a pantry line someone else added", async () => {
    const foodId = await createFood(cook);
    leftoverFoodIds.push(foodId);
    const itemId = await createPantryItem(foodId, cook);

    const { error, count } = await bystander.client
      .from("nutrition_pantry_item")
      .update({ quantity: 250, added_by: bystander.id }, { count: "exact" })
      .eq("id", itemId);

    expect(error).toBeNull();
    expect(count).toBe(1);
  });

  it("lets a member delete a pantry line someone else added", async () => {
    const foodId = await createFood(cook);
    leftoverFoodIds.push(foodId);
    const itemId = await createPantryItem(foodId, cook);

    const { error, count } = await bystander.client
      .from("nutrition_pantry_item")
      .delete({ count: "exact" })
      .eq("id", itemId);

    expect(error).toBeNull();
    expect(count).toBe(1);
  });

  it("hides the pantry from a signed-out caller", async () => {
    const foodId = await createFood(cook);
    leftoverFoodIds.push(foodId);
    const itemId = await createPantryItem(foodId, cook);

    const { data, error } = await anonymous
      .from("nutrition_pantry_item")
      .select("id")
      .eq("id", itemId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("blocks a signed-out caller from adding a pantry line", async () => {
    const foodId = await createFood(cook);
    leftoverFoodIds.push(foodId);

    const { data, error } = await anonymous
      .from("nutrition_pantry_item")
      .insert({
        food_id: foodId,
        quantity: 1,
        unit: "g",
        location: "pantry",
      })
      .select("id")
      .single();

    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("cascades pantry lines away with the food they point at", async () => {
    const foodId = await createFood(cook);
    const itemId = await createPantryItem(foodId, cook);

    const { error: deleteError } = await cook.client
      .from("nutrition_food")
      .delete()
      .eq("id", foodId);
    expect(deleteError).toBeNull();

    const { data } = await admin
      .from("nutrition_pantry_item")
      .select("id")
      .eq("id", itemId);
    expect(data).toEqual([]);
  });

  // === nutrition_recipe / nutrition_recipe_ingredient ================
  //
  // The recipe is another fixed-Family table, so `bystander` proves the
  // same point here as above. The ingredient line is the module's first
  // **inherited** table: it carries no scope of its own and is reachable
  // only through a parent recipe the caller can already reach.

  it("lets any signed-in member add a recipe to the box", async () => {
    const { data, error } = await cook.client
      .from("nutrition_recipe")
      .insert({ title: "Porridge", servings: 2, created_by: cook.id })
      .select("id")
      .single();

    expect(error).toBeNull();
    if (data) leftoverRecipeIds.push(data.id);
  });

  it("lets a member who wrote nothing read the recipe box (fixed Family)", async () => {
    const recipeId = await createRecipe(cook);
    leftoverRecipeIds.push(recipeId);

    const { data, error } = await bystander.client
      .from("nutrition_recipe")
      .select("id")
      .eq("id", recipeId);

    expect(error).toBeNull();
    expect(data).toEqual([{ id: recipeId }]);
  });

  it("lets any member edit and archive a recipe someone else wrote", async () => {
    const recipeId = await createRecipe(cook);
    leftoverRecipeIds.push(recipeId);

    const archivedAt = new Date().toISOString();
    const { error, count } = await bystander.client
      .from("nutrition_recipe")
      .update(
        { title: "Better porridge", archived_at: archivedAt },
        { count: "exact" },
      )
      .eq("id", recipeId);

    expect(error).toBeNull();
    expect(count).toBe(1);
  });

  it("lets any member delete a recipe someone else wrote", async () => {
    const recipeId = await createRecipe(cook);

    const { error, count } = await bystander.client
      .from("nutrition_recipe")
      .delete({ count: "exact" })
      .eq("id", recipeId);

    expect(error).toBeNull();
    expect(count).toBe(1);
  });

  it("hides the recipe box from a signed-out caller", async () => {
    const recipeId = await createRecipe(cook);
    leftoverRecipeIds.push(recipeId);

    const { data, error } = await anonymous
      .from("nutrition_recipe")
      .select("id")
      .eq("id", recipeId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("blocks a signed-out caller from adding a recipe", async () => {
    const { data, error } = await anonymous
      .from("nutrition_recipe")
      .insert({ title: "Sneaky stew", servings: 1 })
      .select("id")
      .single();

    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("lets any signed-in member add an ingredient line to any recipe", async () => {
    const recipeId = await createRecipe(cook);
    leftoverRecipeIds.push(recipeId);

    const { error } = await bystander.client
      .from("nutrition_recipe_ingredient")
      .insert({
        recipe_id: recipeId,
        display_text: "salt to taste",
        position: 0,
      })
      .select("id")
      .single();

    expect(error).toBeNull();
  });

  it("reaches an ingredient line only through a visible parent recipe", async () => {
    const recipeId = await createRecipe(cook);
    leftoverRecipeIds.push(recipeId);
    const ingredientId = await createIngredient(recipeId);

    // A signed-in member can see the recipe, so the line comes with it.
    const { data: visible, error } = await bystander.client
      .from("nutrition_recipe_ingredient")
      .select("id")
      .eq("id", ingredientId);
    expect(error).toBeNull();
    expect(visible).toEqual([{ id: ingredientId }]);

    // Signed out, the parent recipe does not exist — and neither does the
    // line, even though the row is really there (the admin read proves it).
    const { data: hidden } = await anonymous
      .from("nutrition_recipe_ingredient")
      .select("id")
      .eq("id", ingredientId);
    expect(hidden).toEqual([]);

    const { data: reallyThere } = await admin
      .from("nutrition_recipe_ingredient")
      .select("id")
      .eq("id", ingredientId);
    expect(reallyThere).toEqual([{ id: ingredientId }]);
  });

  it("blocks a signed-out caller from adding an ingredient line", async () => {
    const recipeId = await createRecipe(cook);
    leftoverRecipeIds.push(recipeId);

    const { data, error } = await anonymous
      .from("nutrition_recipe_ingredient")
      .insert({
        recipe_id: recipeId,
        display_text: "smuggled garlic",
        position: 0,
      })
      .select("id")
      .single();

    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("refuses an ingredient line whose parent recipe does not exist", async () => {
    const { data, error } = await cook.client
      .from("nutrition_recipe_ingredient")
      .insert({
        recipe_id: "00000000-0000-0000-0000-000000000000",
        display_text: "orphaned line",
        position: 0,
      })
      .select("id")
      .single();

    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("cascades ingredient lines away with the recipe they belong to", async () => {
    const recipeId = await createRecipe(cook);
    const ingredientId = await createIngredient(recipeId);

    const { error } = await cook.client
      .from("nutrition_recipe")
      .delete()
      .eq("id", recipeId);
    expect(error).toBeNull();

    const { data } = await admin
      .from("nutrition_recipe_ingredient")
      .select("id")
      .eq("id", ingredientId);
    expect(data).toEqual([]);
  });

  it("unlinks rather than deletes an ingredient line when its food goes", async () => {
    const foodId = await createFood(cook);
    const recipeId = await createRecipe(cook);
    leftoverRecipeIds.push(recipeId);
    const ingredientId = await createIngredient(recipeId, foodId);

    const { error } = await cook.client
      .from("nutrition_food")
      .delete()
      .eq("id", foodId);
    expect(error).toBeNull();

    const { data } = await admin
      .from("nutrition_recipe_ingredient")
      .select("id, food_id, display_text")
      .eq("id", ingredientId)
      .single();

    expect(data?.food_id).toBeNull();
    expect(data?.display_text).not.toBe("");
  });
});
