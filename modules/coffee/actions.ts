"use server";

import { revalidatePath } from "next/cache";

import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import { removePhotoObject } from "@/modules/coffee/lib/photo-storage";
import {
  validateBean,
  validateGrindProfile,
} from "@/modules/coffee/lib/validation";
import {
  createBean,
  createGrindProfile,
  deleteBean,
  deleteGrindProfile,
  getBeanPhotoPath,
  setBeanPhoto,
  updateBean,
  updateGrindProfile,
} from "@/modules/coffee/queries";

/**
 * Server Actions behind the coffee catalog. Any signed-in member may write
 * (RLS, ADR-0004/0006/0007); validation errors come back as `{ error }` for
 * the form to show, database errors throw to the error boundary.
 */
export type ActionResult = { error: string } | { error?: undefined };

type BeanFields = {
  name: string;
  roaster?: string | null;
  origin?: string | null;
  notes?: string | null;
  roastLevel?: string | null;
};

type ProfileFields = {
  label: string;
  description?: string | null;
  grindSize: string | number;
};

async function requireMember() {
  const member = await getCurrentMember();
  if (!member) throw new Error("Not signed in");
  return member;
}

export async function createBeanAction(
  fields: BeanFields,
): Promise<ActionResult & { id?: string }> {
  await requireMember();
  const parsed = validateBean(fields);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const id = await createBean(supabase, parsed.value);

  revalidatePath("/coffee");
  return { id };
}

export async function updateBeanAction(
  beanId: string,
  fields: BeanFields,
): Promise<ActionResult> {
  await requireMember();
  const parsed = validateBean(fields);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  await updateBean(supabase, beanId, parsed.value);

  revalidatePath("/coffee");
  revalidatePath(`/coffee/${beanId}`);
  return {};
}

export async function deleteBeanAction(beanId: string): Promise<void> {
  await requireMember();
  const supabase = await createClient();

  const photoPath = await getBeanPhotoPath(supabase, beanId);
  await deleteBean(supabase, beanId);
  await removePhotoObject(supabase, photoPath);

  revalidatePath("/coffee");
}

/**
 * Records a freshly uploaded bag photo on the bean, then removes the photo it
 * replaces (best-effort, after the database write). The object path must sit
 * under the bean's own folder.
 */
export async function setBeanPhotoAction(
  beanId: string,
  photo: { path: string; blur: string },
): Promise<ActionResult> {
  await requireMember();
  if (!photo.path.startsWith(`${beanId}/`)) {
    return { error: "Invalid photo path." };
  }

  const supabase = await createClient();
  const previousPath = await getBeanPhotoPath(supabase, beanId);
  await setBeanPhoto(supabase, beanId, photo);
  if (previousPath !== photo.path) {
    await removePhotoObject(supabase, previousPath);
  }

  revalidatePath("/coffee");
  revalidatePath(`/coffee/${beanId}`);
  return {};
}

export async function createGrindProfileAction(
  beanId: string,
  fields: ProfileFields,
): Promise<ActionResult> {
  await requireMember();
  const parsed = validateGrindProfile(fields);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  await createGrindProfile(supabase, { bean_id: beanId, ...parsed.value });

  revalidatePath(`/coffee/${beanId}`);
  return {};
}

export async function updateGrindProfileAction(
  beanId: string,
  profileId: string,
  fields: ProfileFields,
): Promise<ActionResult> {
  await requireMember();
  const parsed = validateGrindProfile(fields);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  await updateGrindProfile(supabase, profileId, parsed.value);

  revalidatePath(`/coffee/${beanId}`);
  return {};
}

export async function deleteGrindProfileAction(
  beanId: string,
  profileId: string,
): Promise<void> {
  await requireMember();
  const supabase = await createClient();

  await deleteGrindProfile(supabase, profileId);

  revalidatePath(`/coffee/${beanId}`);
}
