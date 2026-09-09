import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";

import { PantryHome } from "@/modules/nutrition/components/pantry-home";
import { getFoods, getPantryItems } from "@/modules/nutrition/queries";

export default async function NutritionPage() {
  const member = await getCurrentMember();
  // The proxy (ADR-0011) redirects signed-out requests to /sign-in before
  // this component ever runs.
  if (!member) return null;

  const supabase = await createClient();
  const [items, foods] = await Promise.all([
    getPantryItems(supabase),
    getFoods(supabase),
  ]);

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-4 sm:p-6">
        <div>
          <h1 className="text-xl font-semibold">Pantry</h1>
          <p className="text-sm text-muted-foreground">
            What the household has in, and where it&apos;s kept. Anyone can add
            or adjust a line.
          </p>
        </div>

        <PantryHome items={items} foods={foods} />
      </main>
    </>
  );
}
