"use server";

import { revalidatePath } from "next/cache";

import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import { isBlank } from "@/modules/lists/lib/validation";
import {
  addParticipant,
  clearCheckedItems,
  deleteItem,
  deleteList,
  getListItems,
  insertItem,
  insertList,
  removeParticipant,
  setItemChecked,
  setListArchived,
  uncheckAllItems,
  updateItemPosition,
  updateItemText,
  updateListKind,
  updateListScope,
  updateListTitle,
  type Scope,
} from "@/modules/lists/queries";

/**
 * Server actions behind the lists UI (lists.md §2, §3, #35). Every write
 * still rides RLS (lists.md §2): owner-only rename/scope/participants/
 * archive/delete, item writes open to anyone who can see the list. These
 * actions don't re-check ownership themselves — a non-owner's request just
 * comes back as a Postgres RLS error.
 */
async function requireMember() {
  const member = await getCurrentMember();
  if (!member) throw new Error("Not signed in");
  return member;
}

function revalidateList(listId: string) {
  revalidatePath("/lists");
  revalidatePath(`/lists/${listId}`);
}

export async function createListAction(input: {
  title: string;
  kind: string;
  scope: Scope;
}) {
  if (isBlank(input.title)) throw new Error("Title is required");

  const member = await requireMember();
  const supabase = await createClient();

  const list = await insertList(supabase, {
    ownerMemberId: member.id,
    title: input.title.trim(),
    kind: input.kind,
    scope: input.scope,
  });

  revalidatePath("/lists");
  return list;
}

export async function renameListAction(listId: string, title: string) {
  if (isBlank(title)) throw new Error("Title is required");

  await requireMember();
  const supabase = await createClient();

  await updateListTitle(supabase, listId, title.trim());
  revalidateList(listId);
}

export async function changeListKindAction(listId: string, kind: string) {
  await requireMember();
  const supabase = await createClient();

  await updateListKind(supabase, listId, kind);
  revalidateList(listId);
}

export async function changeListScopeAction(listId: string, scope: Scope) {
  await requireMember();
  const supabase = await createClient();

  await updateListScope(supabase, listId, scope);
  revalidateList(listId);
}

export async function archiveListAction(listId: string) {
  await requireMember();
  const supabase = await createClient();

  await setListArchived(supabase, listId, true);
  revalidateList(listId);
}

export async function unarchiveListAction(listId: string) {
  await requireMember();
  const supabase = await createClient();

  await setListArchived(supabase, listId, false);
  revalidateList(listId);
}

export async function deleteListAction(listId: string) {
  await requireMember();
  const supabase = await createClient();

  await deleteList(supabase, listId);
  revalidatePath("/lists");
}

export async function addParticipantAction(listId: string, memberId: string) {
  await requireMember();
  const supabase = await createClient();

  await addParticipant(supabase, listId, memberId);
  revalidateList(listId);
}

export async function removeParticipantAction(
  listId: string,
  memberId: string,
) {
  await requireMember();
  const supabase = await createClient();

  await removeParticipant(supabase, listId, memberId);
  revalidateList(listId);
}

export async function addItemAction(listId: string, text: string) {
  if (isBlank(text)) throw new Error("Item text is required");

  await requireMember();
  const supabase = await createClient();

  const items = await getListItems(supabase, listId);
  const position = items.filter((item) => !item.checked).length;

  await insertItem(supabase, { listId, text: text.trim(), position });
  revalidateList(listId);
}

export async function updateItemTextAction(
  listId: string,
  itemId: string,
  text: string,
) {
  if (isBlank(text)) throw new Error("Item text is required");

  await requireMember();
  const supabase = await createClient();

  await updateItemText(supabase, itemId, text.trim());
  revalidateList(listId);
}

/**
 * Unchecking moves an item back into the active group (lists.md §3), so it
 * also gets a fresh `position` at the end of the active items — otherwise it
 * would keep whatever stale position it had from before it was last checked,
 * which can collide with an active item's current position.
 */
export async function toggleItemCheckedAction(
  listId: string,
  itemId: string,
  checked: boolean,
) {
  await requireMember();
  const supabase = await createClient();

  if (checked) {
    await setItemChecked(supabase, itemId, true);
  } else {
    const items = await getListItems(supabase, listId);
    const activeCount = items.filter(
      (item) => !item.checked && item.id !== itemId,
    ).length;

    await setItemChecked(supabase, itemId, false);
    await updateItemPosition(supabase, itemId, activeCount);
  }
  revalidateList(listId);
}

export async function deleteItemAction(listId: string, itemId: string) {
  await requireMember();
  const supabase = await createClient();

  await deleteItem(supabase, itemId);
  revalidateList(listId);
}

/**
 * Persists a full reorder of a list's active items: `orderedIds` is every
 * active item id in its new order, so positions are simply the array index
 * (mirrors `platform/pins.ts`'s `reorderPins`).
 */
export async function reorderItemsAction(listId: string, orderedIds: string[]) {
  await requireMember();
  const supabase = await createClient();

  await Promise.all(
    orderedIds.map((id, position) =>
      updateItemPosition(supabase, id, position),
    ),
  );
  revalidateList(listId);
}

export async function uncheckAllAction(listId: string) {
  await requireMember();
  const supabase = await createClient();

  await uncheckAllItems(supabase, listId);
  revalidateList(listId);
}

export async function clearCheckedAction(listId: string) {
  await requireMember();
  const supabase = await createClient();

  await clearCheckedItems(supabase, listId);
  revalidateList(listId);
}
