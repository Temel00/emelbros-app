import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type CoffeeBeanRow = Database["public"]["Tables"]["coffee_bean"]["Row"];
export type CoffeeGrindProfileRow =
  Database["public"]["Tables"]["coffee_grind_profile"]["Row"];

/** A bean with its grind profiles, finest to coarsest. */
export type CoffeeBeanWithProfiles = CoffeeBeanRow & {
  profiles: CoffeeGrindProfileRow[];
};

/**
 * The coffee module's query layer (ADR-0009): unwraps `{ data, error }` and
 * throws on `error`, so callers never branch on Supabase's error shape.
 */

/** Lists every bean, ordered by name. */
export async function listBeans(
  supabase: SupabaseClient<Database>,
): Promise<CoffeeBeanRow[]> {
  const { data, error } = await supabase
    .from("coffee_bean")
    .select()
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Reads one bean with its grind profiles ordered by grind size. `null` for a
 * bean that doesn't exist or that RLS hides.
 */
export async function getBean(
  supabase: SupabaseClient<Database>,
  beanId: string,
): Promise<CoffeeBeanWithProfiles | null> {
  const { data: bean, error } = await supabase
    .from("coffee_bean")
    .select()
    .eq("id", beanId)
    .maybeSingle();

  if (error) throw error;
  if (!bean) return null;

  const { data: profiles, error: profilesError } = await supabase
    .from("coffee_grind_profile")
    .select()
    .eq("bean_id", beanId)
    .order("grind_size", { ascending: true });

  if (profilesError) throw profilesError;
  return { ...bean, profiles };
}

/** Inserts a bean and returns its id. */
export async function createBean(
  supabase: SupabaseClient<Database>,
  input: Database["public"]["Tables"]["coffee_bean"]["Insert"],
): Promise<string> {
  const { data, error } = await supabase
    .from("coffee_bean")
    .insert(input)
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

/** Updates a bean's editable fields; `photo_path` is never touched here. */
export async function updateBean(
  supabase: SupabaseClient<Database>,
  beanId: string,
  patch: Database["public"]["Tables"]["coffee_bean"]["Update"],
): Promise<void> {
  const { error } = await supabase
    .from("coffee_bean")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", beanId);

  if (error) throw error;
}

/** Deletes a bean; its grind profiles go with it (cascade). */
export async function deleteBean(
  supabase: SupabaseClient<Database>,
  beanId: string,
): Promise<void> {
  const { error } = await supabase
    .from("coffee_bean")
    .delete()
    .eq("id", beanId);

  if (error) throw error;
}

export async function createGrindProfile(
  supabase: SupabaseClient<Database>,
  input: Database["public"]["Tables"]["coffee_grind_profile"]["Insert"],
): Promise<void> {
  const { error } = await supabase.from("coffee_grind_profile").insert(input);

  if (error) throw error;
}

export async function updateGrindProfile(
  supabase: SupabaseClient<Database>,
  profileId: string,
  patch: Database["public"]["Tables"]["coffee_grind_profile"]["Update"],
): Promise<void> {
  const { error } = await supabase
    .from("coffee_grind_profile")
    .update(patch)
    .eq("id", profileId);

  if (error) throw error;
}

export async function deleteGrindProfile(
  supabase: SupabaseClient<Database>,
  profileId: string,
): Promise<void> {
  const { error } = await supabase
    .from("coffee_grind_profile")
    .delete()
    .eq("id", profileId);

  if (error) throw error;
}
