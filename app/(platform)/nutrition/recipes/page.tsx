import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";

import { NutritionNav } from "@/modules/nutrition/components/nutrition-nav";
import { RecipeBox } from "@/modules/nutrition/components/recipe-box";
import { getRecipes } from "@/modules/nutrition/queries";

export default async function RecipesPage() {
  const member = await getCurrentMember();
  // The proxy (ADR-0011) redirects signed-out requests to /sign-in before
  // this component ever runs.
  if (!member) return null;

  const supabase = await createClient();
  const recipes = await getRecipes(supabase);

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-4 sm:p-6">
        <NutritionNav active="recipes" />

        <div>
          <h1 className="text-xl font-semibold">Recipes</h1>
          <p className="text-sm text-muted-foreground">
            The household&apos;s recipe box. Anyone can add, edit, or archive a
            recipe.
          </p>
        </div>

        <RecipeBox recipes={recipes} />
      </main>
    </>
  );
}
