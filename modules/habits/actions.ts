"use server";

import { revalidatePath } from "next/cache";

import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import type { Database } from "@/types/database";

import {
  archiveTrackable,
  createTrackable,
  deleteLog,
  deleteTrackable,
  restoreTrackable,
  updateTrackable,
  upsertLog,
} from "@/modules/habits/queries";

type Scope = Database["public"]["Enums"]["scope"];

/**
 * Server Actions behind the habits module home (docs/modules/habits.md §2,
 * §3, §4). Trackable writes are owner-only by RLS; these actions run as the
 * signed-in member, so a non-owner's call simply affects zero rows.
 */
async function requireMember() {
  const member = await getCurrentMember();
  if (!member) throw new Error("Not signed in");
  return member;
}

export async function createTrackableAction(input: {
  title: string;
  kind: string;
  scope?: Scope;
  cadenceType?: "daily" | "weekly" | "weekdays" | null;
  cadenceTarget?: number | null;
  cadenceWeekdays?: number[] | null;
}) {
  const member = await requireMember();
  const supabase = await createClient();

  await createTrackable(supabase, {
    ownerMemberId: member.id,
    ...input,
  });

  revalidatePath("/habits");
}

export async function updateTrackableAction(
  id: string,
  patch: {
    title?: string;
    scope?: Scope;
    cadenceType?: "daily" | "weekly" | "weekdays" | null;
    cadenceTarget?: number | null;
    cadenceWeekdays?: number[] | null;
  },
) {
  await requireMember();
  const supabase = await createClient();

  await updateTrackable(supabase, id, patch);

  revalidatePath("/habits");
}

export async function archiveTrackableAction(id: string) {
  await requireMember();
  const supabase = await createClient();

  await archiveTrackable(supabase, id);

  revalidatePath("/habits");
}

export async function restoreTrackableAction(id: string) {
  await requireMember();
  const supabase = await createClient();

  await restoreTrackable(supabase, id);

  revalidatePath("/habits");
}

export async function deleteTrackableAction(id: string) {
  await requireMember();
  const supabase = await createClient();

  await deleteTrackable(supabase, id);

  revalidatePath("/habits");
}

/** Logs (or backfills) one day for a trackable — upserts the `(trackable, date)` row. */
export async function logDayAction(input: {
  trackableId: string;
  logDate: string;
  done?: boolean;
  value?: number | null;
  note?: string | null;
}) {
  await requireMember();
  const supabase = await createClient();

  await upsertLog(supabase, input);

  revalidatePath("/habits");
}

export async function deleteLogAction(trackableId: string, logDate: string) {
  await requireMember();
  const supabase = await createClient();

  await deleteLog(supabase, trackableId, logDate);

  revalidatePath("/habits");
}
