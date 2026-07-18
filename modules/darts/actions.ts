"use server";

import { revalidatePath } from "next/cache";

import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import { deleteGame } from "@/modules/darts/queries";

/**
 * Server actions behind the darts UI. Deletion (darts.md §6) is the only
 * write this issue's pages need — game creation and live scoring belong to
 * #31. RLS is what actually decides who may delete (owner or a member who
 * played); this action doesn't re-check that itself.
 */
async function requireMember() {
  const member = await getCurrentMember();
  if (!member) throw new Error("Not signed in");
  return member;
}

export async function deleteGameAction(gameId: string) {
  await requireMember();
  const supabase = await createClient();

  await deleteGame(supabase, gameId);

  revalidatePath("/darts");
  revalidatePath("/darts/stats");
  revalidatePath(`/darts/${gameId}`);
}
