"use server";

import { revalidatePath } from "next/cache";

import { getCurrentMember } from "@/platform/auth";
import {
  deletePin,
  getPins,
  insertPin,
  updatePinPosition,
} from "@/platform/queries";
import { createClient } from "@/platform/supabase/server";

/**
 * Server actions behind the dashboard's Edit mode (#27, ADR-0002). Each pin
 * row is `(member, module, widget?, position)`; `widget: null` rows are the
 * Apps zone, `widget` rows are the At-a-glance zone — two independently
 * ordered sequences distinguished by whether `widget` is null.
 */
async function requireMember() {
  const member = await getCurrentMember();
  if (!member) throw new Error("Not signed in");
  return member;
}

export async function pinItem(module: string, widget: string | null) {
  const member = await requireMember();
  const supabase = await createClient();

  const pins = await getPins(supabase, member.id);
  const siblingCount = pins.filter((pin) =>
    widget === null ? pin.widget === null : pin.widget !== null,
  ).length;

  await insertPin(supabase, {
    memberId: member.id,
    module,
    widget,
    position: siblingCount,
  });

  revalidatePath("/");
}

export async function unpinItem(module: string, widget: string | null) {
  const member = await requireMember();
  const supabase = await createClient();

  await deletePin(supabase, member.id, module, widget);

  revalidatePath("/");
}

/**
 * Persists a full reorder of one zone: `orderedIds` is every pin id in that
 * zone in its new order, so positions are simply the array index.
 */
export async function reorderPins(orderedIds: string[]) {
  await requireMember();
  const supabase = await createClient();

  await Promise.all(
    orderedIds.map((id, position) => updatePinPosition(supabase, id, position)),
  );

  revalidatePath("/");
}
