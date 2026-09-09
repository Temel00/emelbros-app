"use server";

import { revalidatePath } from "next/cache";

import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import {
  isBlank,
  isValidAmount,
  trimToNull,
} from "@/modules/nutrition/lib/validation";
import {
  deletePantryItem,
  insertFood,
  insertPantryItem,
  updatePantryItem,
  type FoodRow,
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
