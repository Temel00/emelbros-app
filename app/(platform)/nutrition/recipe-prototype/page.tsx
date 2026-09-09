import { Suspense } from "react";

import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import { PrototypeRecipeHarness } from "@/modules/nutrition/components/prototype-recipe-harness";
import { getFoods } from "@/modules/nutrition/queries";

/**
 * PROTOTYPE ONLY — throwaway route. Delete when wayfinder #113 resolves.
 *
 * Three variants of the recipe box + recipe editor, switchable via
 * `?variant=`, mounted in the same shell as the real nutrition page (same
 * header, same `max-w-3xl` column) so the vertical budget is honest.
 *
 * Its own route rather than a `?variant=` branch on the (not-yet-existing)
 * real recipes page, since there's nothing to host it in yet — this
 * prototype is what decides what that page becomes (#114).
 *
 * Foods come from the real `nutrition_food` dictionary (read-only) so the
 * food-linking widget has real names to search; recipes are in-memory mock
 * data — nothing here writes to `nutrition_recipe`.
 */
export default async function RecipePrototypePage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>;
}) {
  const { variant } = await searchParams;

  const member = await getCurrentMember();
  if (!member) return null;

  const supabase = await createClient();
  const foods = await getFoods(supabase);

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 sm:p-6">
        <Suspense>
          <PrototypeRecipeHarness variant={variant ?? "A"} foods={foods} />
        </Suspense>
      </main>
    </>
  );
}
