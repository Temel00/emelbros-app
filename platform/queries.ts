import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Sample of the `queries.ts` convention (ADR-0009): unwrap `{ data, error }`
 * and throw on `error`, so call sites never branch on Supabase's error shape.
 */
export async function getProfile(
  supabase: SupabaseClient<Database>,
  memberId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", memberId)
    .single();

  if (error) throw error;
  return data;
}
