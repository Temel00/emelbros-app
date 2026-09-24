import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";

import { NutritionNav } from "@/modules/nutrition/components/nutrition-nav";
import { PantryHome } from "@/modules/nutrition/components/pantry-home";
import { PrototypeFolderCard } from "@/modules/nutrition/components/prototype-folder-card";
import {
  getFoods,
  getPantryItems,
  getPantryLocations,
  getUnits,
} from "@/modules/nutrition/queries";

export default async function NutritionPage() {
  const member = await getCurrentMember();
  // The proxy (ADR-0011) redirects signed-out requests to /sign-in before
  // this component ever runs.
  if (!member) return null;

  const supabase = await createClient();
  const [items, foods, units, locations] = await Promise.all([
    getPantryItems(supabase),
    getFoods(supabase),
    getUnits(supabase),
    getPantryLocations(supabase),
  ]);

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-4 sm:p-6">
        <NutritionNav active="pantry" />

        <PrototypeFolderCard
          active="pantry"
          title="Pantry"
          description="What the household has in, and where it's kept. Anyone can add or adjust a line."
        >
          <PantryHome
            items={items}
            foods={foods}
            units={units}
            locations={locations}
          />
        </PrototypeFolderCard>
      </main>
    </>
  );
}
