import { notFound } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { PrototypeSwitcher } from "@/components/prototype-switcher";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";

import { RecipeEditor } from "@/modules/nutrition/components/recipe-editor";
import { getFoods, getRecipe } from "@/modules/nutrition/queries";

export default async function RecipeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ variant?: string }>;
}) {
  const { id } = await params;
  const { variant } = await searchParams;

  const member = await getCurrentMember();
  // The proxy (ADR-0011) redirects signed-out requests to /sign-in before
  // this component ever runs.
  if (!member) return null;

  const supabase = await createClient();
  const recipe = await getRecipe(supabase, id);
  // RLS returns no row for a recipe the caller can't see — same response as
  // one that doesn't exist. An archived recipe still resolves: this is the
  // detail view an archived recipe is read through (nutrition.md §3.3).
  if (!recipe) notFound();

  const foods = await getFoods(supabase);

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-4 sm:p-6">
        <RecipeEditor recipe={recipe} foods={foods} prototypeVariant={variant} />
      </main>
      {process.env.NODE_ENV !== "production" && variant && (
        <PrototypeSwitcher
          variants={["A", "B", "C"]}
          labels={{ A: "Accordion", B: "Inline Row", C: "Two Paths" }}
          current={variant}
        />
      )}
    </>
  );
}
