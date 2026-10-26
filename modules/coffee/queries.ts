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
