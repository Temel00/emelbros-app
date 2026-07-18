import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type Pin = Database["public"]["Tables"]["pins"]["Row"];

/**
 * Sample of the `queries.ts` convention (ADR-0009): unwrap `{ data, error }`
 * and throw on `error`, so call sites never branch on Supabase's error shape.
 *
 * Returns `null` rather than throwing when the member has no profile row —
 * `.maybeSingle()`, not `.single()`. A valid JWT whose member row no longer
 * exists (e.g. after a local `supabase db reset`) is a recoverable stale
 * session, not a query failure: callers treat `null` as "re-authenticate"
 * (see `AppHeader`), so it must not surface as a thrown "no rows" error.
 */
export async function getProfile(
  supabase: SupabaseClient<Database>,
  memberId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", memberId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * A member's pin rows (ADR-0002), ordered by `position`. Rows with
 * `widget: null` are the Apps zone; rows with a `widget` are the At-a-glance
 * zone — two independently-ordered sequences from the one table (#8).
 */
export async function getPins(
  supabase: SupabaseClient<Database>,
  memberId: string,
): Promise<Pin[]> {
  const { data, error } = await supabase
    .from("pins")
    .select("*")
    .eq("member_id", memberId)
    .order("position", { ascending: true });

  if (error) throw error;
  return data;
}

export async function insertPin(
  supabase: SupabaseClient<Database>,
  pin: {
    memberId: string;
    module: string;
    widget: string | null;
    position: number;
  },
): Promise<void> {
  const { error } = await supabase.from("pins").insert({
    member_id: pin.memberId,
    module: pin.module,
    widget: pin.widget,
    position: pin.position,
  });

  if (error) throw error;
}

export async function deletePin(
  supabase: SupabaseClient<Database>,
  memberId: string,
  module: string,
  widget: string | null,
): Promise<void> {
  const query = supabase
    .from("pins")
    .delete()
    .eq("member_id", memberId)
    .eq("module", module);

  const { error } = await (widget === null
    ? query.is("widget", null)
    : query.eq("widget", widget));

  if (error) throw error;
}

export async function updatePinPosition(
  supabase: SupabaseClient<Database>,
  id: string,
  position: number,
): Promise<void> {
  const { error } = await supabase
    .from("pins")
    .update({ position })
    .eq("id", id);

  if (error) throw error;
}
