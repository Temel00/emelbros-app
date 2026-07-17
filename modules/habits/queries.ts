import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type Trackable = Database["public"]["Tables"]["habits_trackable"]["Row"];
type Log = Database["public"]["Tables"]["habits_log"]["Row"];
type Scope = Database["public"]["Enums"]["scope"];

/**
 * The habits module's query layer (ADR-0009): unwrap `{ data, error }` and
 * throw on `error`, so route handlers, Server Actions, and components never
 * branch on Supabase's error shape.
 */

export async function getTrackables(
  supabase: SupabaseClient<Database>,
  ownerMemberId: string,
  { includeArchived = false }: { includeArchived?: boolean } = {},
): Promise<Trackable[]> {
  let query = supabase
    .from("habits_trackable")
    .select("*")
    .eq("owner_member_id", ownerMemberId)
    .order("created_at", { ascending: true });

  if (!includeArchived) {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getTrackable(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Trackable> {
  const { data, error } = await supabase
    .from("habits_trackable")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createTrackable(
  supabase: SupabaseClient<Database>,
  input: {
    ownerMemberId: string;
    title: string;
    kind: string;
    scope?: Scope;
    cadenceType?: "daily" | "weekly" | "weekdays" | null;
    cadenceTarget?: number | null;
    cadenceWeekdays?: number[] | null;
  },
): Promise<Trackable> {
  const { data, error } = await supabase
    .from("habits_trackable")
    .insert({
      owner_member_id: input.ownerMemberId,
      title: input.title,
      kind: input.kind,
      scope: input.scope ?? "private",
      cadence_type: input.cadenceType ?? null,
      cadence_target: input.cadenceTarget ?? null,
      cadence_weekdays: input.cadenceWeekdays ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTrackable(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: {
    title?: string;
    scope?: Scope;
    cadenceType?: "daily" | "weekly" | "weekdays" | null;
    cadenceTarget?: number | null;
    cadenceWeekdays?: number[] | null;
  },
): Promise<Trackable> {
  const { data, error } = await supabase
    .from("habits_trackable")
    .update({
      ...(patch.title !== undefined && { title: patch.title }),
      ...(patch.scope !== undefined && { scope: patch.scope }),
      ...(patch.cadenceType !== undefined && {
        cadence_type: patch.cadenceType,
      }),
      ...(patch.cadenceTarget !== undefined && {
        cadence_target: patch.cadenceTarget,
      }),
      ...(patch.cadenceWeekdays !== undefined && {
        cadence_weekdays: patch.cadenceWeekdays,
      }),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function archiveTrackable(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("habits_trackable")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function restoreTrackable(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("habits_trackable")
    .update({ archived_at: null })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteTrackable(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("habits_trackable")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/** All logs for one trackable, oldest first — enough history for streak/trend derivation. */
export async function getLogs(
  supabase: SupabaseClient<Database>,
  trackableId: string,
): Promise<Log[]> {
  const { data, error } = await supabase
    .from("habits_log")
    .select("*")
    .eq("trackable_id", trackableId)
    .order("log_date", { ascending: true });

  if (error) throw error;
  return data;
}

/** Logs across several trackables in one query, e.g. for the due-today/streak sweep. */
export async function getLogsForTrackables(
  supabase: SupabaseClient<Database>,
  trackableIds: string[],
): Promise<Log[]> {
  if (trackableIds.length === 0) return [];

  const { data, error } = await supabase
    .from("habits_log")
    .select("*")
    .in("trackable_id", trackableIds)
    .order("log_date", { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Logs today (or backfills a past date): upserts the single `(trackable_id,
 * log_date)` row (docs/modules/habits.md §4) rather than appending.
 */
export async function upsertLog(
  supabase: SupabaseClient<Database>,
  input: {
    trackableId: string;
    logDate: string;
    done?: boolean;
    value?: number | null;
    note?: string | null;
  },
): Promise<Log> {
  const { data, error } = await supabase
    .from("habits_log")
    .upsert(
      {
        trackable_id: input.trackableId,
        log_date: input.logDate,
        ...(input.done !== undefined && { done: input.done }),
        ...(input.value !== undefined && { value: input.value }),
        ...(input.note !== undefined && { note: input.note }),
      },
      { onConflict: "trackable_id,log_date" },
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteLog(
  supabase: SupabaseClient<Database>,
  trackableId: string,
  logDate: string,
): Promise<void> {
  const { error } = await supabase
    .from("habits_log")
    .delete()
    .eq("trackable_id", trackableId)
    .eq("log_date", logDate);

  if (error) throw error;
}

export async function getParticipants(
  supabase: SupabaseClient<Database>,
  trackableId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("habits_participant")
    .select("member_id")
    .eq("trackable_id", trackableId);

  if (error) throw error;
  return data.map((row) => row.member_id);
}

export async function addParticipant(
  supabase: SupabaseClient<Database>,
  trackableId: string,
  memberId: string,
): Promise<void> {
  const { error } = await supabase
    .from("habits_participant")
    .insert({ trackable_id: trackableId, member_id: memberId });

  if (error) throw error;
}

export async function removeParticipant(
  supabase: SupabaseClient<Database>,
  trackableId: string,
  memberId: string,
): Promise<void> {
  const { error } = await supabase
    .from("habits_participant")
    .delete()
    .eq("trackable_id", trackableId)
    .eq("member_id", memberId);

  if (error) throw error;
}
