import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type ListRow = Database["public"]["Tables"]["lists_list"]["Row"];
export type ItemRow = Database["public"]["Tables"]["lists_item"]["Row"];
export type ParticipantRow =
  Database["public"]["Tables"]["lists_participant"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type Scope = Database["public"]["Enums"]["scope"];

/**
 * The lists query layer (ADR-0009): every function unwraps `{ data, error }`
 * and throws on `error`. RLS (lists.md §2) is what actually enforces
 * visibility and owner-only writes — these functions never re-check either.
 */

// === lists_list =====================================================

/**
 * A member's visible, non-archived lists (lists.md §6), most-recently-active
 * first. RLS already filters to lists the caller can see; no member id is
 * passed in.
 */
export async function getVisibleLists(
  supabase: SupabaseClient<Database>,
): Promise<ListRow[]> {
  const { data, error } = await supabase
    .from("lists_list")
    .select("*")
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data;
}

/** Archived lists (lists.md §3) — kept recoverable, so a view must exist. */
export async function getArchivedLists(
  supabase: SupabaseClient<Database>,
): Promise<ListRow[]> {
  const { data, error } = await supabase
    .from("lists_list")
    .select("*")
    .not("archived_at", "is", null)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getList(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<ListRow | null> {
  const { data, error } = await supabase
    .from("lists_list")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function insertList(
  supabase: SupabaseClient<Database>,
  list: { ownerMemberId: string; title: string; kind: string; scope: Scope },
): Promise<ListRow> {
  const { data, error } = await supabase
    .from("lists_list")
    .insert({
      owner_member_id: list.ownerMemberId,
      title: list.title,
      kind: list.kind,
      scope: list.scope,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateListTitle(
  supabase: SupabaseClient<Database>,
  id: string,
  title: string,
): Promise<void> {
  const { error } = await supabase
    .from("lists_list")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Changing a list's kind never migrates data (lists.md §8) — the base
 * list/item model is shared across every kind, so this is a plain column
 * update.
 */
export async function updateListKind(
  supabase: SupabaseClient<Database>,
  id: string,
  kind: string,
): Promise<void> {
  const { error } = await supabase
    .from("lists_list")
    .update({ kind, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function updateListScope(
  supabase: SupabaseClient<Database>,
  id: string,
  scope: Scope,
): Promise<void> {
  const { error } = await supabase
    .from("lists_list")
    .update({ scope, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function setListArchived(
  supabase: SupabaseClient<Database>,
  id: string,
  archived: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("lists_list")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteList(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("lists_list").delete().eq("id", id);

  if (error) throw error;
}

// === lists_participant ===============================================

export async function getListParticipants(
  supabase: SupabaseClient<Database>,
  listId: string,
): Promise<ParticipantRow[]> {
  const { data, error } = await supabase
    .from("lists_participant")
    .select("*")
    .eq("list_id", listId);

  if (error) throw error;
  return data;
}

/** Every member profile (family-readable) besides the given one — the pool a list owner picks participants from. */
export async function getOtherProfiles(
  supabase: SupabaseClient<Database>,
  excludeMemberId: string,
): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .neq("id", excludeMemberId);

  if (error) throw error;
  return data;
}

export async function addParticipant(
  supabase: SupabaseClient<Database>,
  listId: string,
  memberId: string,
): Promise<void> {
  const { error } = await supabase
    .from("lists_participant")
    .insert({ list_id: listId, member_id: memberId });

  if (error) throw error;
}

export async function removeParticipant(
  supabase: SupabaseClient<Database>,
  listId: string,
  memberId: string,
): Promise<void> {
  const { error } = await supabase
    .from("lists_participant")
    .delete()
    .eq("list_id", listId)
    .eq("member_id", memberId);

  if (error) throw error;
}

// === lists_item ========================================================

/**
 * A list's items, active-first by `position` then checked (lists.md §3):
 * checked items sink below active ones rather than disappearing.
 */
export async function getListItems(
  supabase: SupabaseClient<Database>,
  listId: string,
): Promise<ItemRow[]> {
  const { data, error } = await supabase
    .from("lists_item")
    .select("*")
    .eq("list_id", listId)
    .order("checked", { ascending: true })
    .order("position", { ascending: true });

  if (error) throw error;
  return data;
}

export async function insertItem(
  supabase: SupabaseClient<Database>,
  item: { listId: string; text: string; position: number },
): Promise<ItemRow> {
  const { data, error } = await supabase
    .from("lists_item")
    .insert({ list_id: item.listId, text: item.text, position: item.position })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateItemText(
  supabase: SupabaseClient<Database>,
  id: string,
  text: string,
): Promise<void> {
  const { error } = await supabase
    .from("lists_item")
    .update({ text })
    .eq("id", id);

  if (error) throw error;
}

export async function setItemChecked(
  supabase: SupabaseClient<Database>,
  id: string,
  checked: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("lists_item")
    .update({ checked })
    .eq("id", id);

  if (error) throw error;
}

export async function updateItemPosition(
  supabase: SupabaseClient<Database>,
  id: string,
  position: number,
): Promise<void> {
  const { error } = await supabase
    .from("lists_item")
    .update({ position })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteItem(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("lists_item").delete().eq("id", id);

  if (error) throw error;
}

/** Bulk action: reset every checked item on a list back to active (lists.md §3). */
export async function uncheckAllItems(
  supabase: SupabaseClient<Database>,
  listId: string,
): Promise<void> {
  const { error } = await supabase
    .from("lists_item")
    .update({ checked: false })
    .eq("list_id", listId)
    .eq("checked", true);

  if (error) throw error;
}

/** Bulk action: permanently delete every checked item on a list (lists.md §3). */
export async function clearCheckedItems(
  supabase: SupabaseClient<Database>,
  listId: string,
): Promise<void> {
  const { error } = await supabase
    .from("lists_item")
    .delete()
    .eq("list_id", listId)
    .eq("checked", true);

  if (error) throw error;
}
