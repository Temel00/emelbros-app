import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";

import { NutritionNav } from "@/modules/nutrition/components/nutrition-nav";
import { PantryFieldSettings } from "@/modules/nutrition/components/pantry-field-settings";
import { PrototypeFolderCard } from "@/modules/nutrition/components/prototype-folder-card";
import {
  getAllPantryLocations,
  getAllUnits,
} from "@/modules/nutrition/queries";

/**
 * Nutrition settings (#157): manage the two shared pantry-field vocabularies —
 * units and pantry locations. Both full lists (archived included) are fetched
 * server-side and handed to the client editor; every mutation runs through the
 * managed-vocabulary server actions (#156), which revalidate `/nutrition`.
 */
export default async function NutritionSettingsPage() {
  const member = await getCurrentMember();
  // The proxy (ADR-0011) redirects signed-out requests to /sign-in before
  // this component ever runs.
  if (!member) return null;

  const supabase = await createClient();
  const [units, locations] = await Promise.all([
    getAllUnits(supabase),
    getAllPantryLocations(supabase),
  ]);

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-4 sm:p-6">
        <NutritionNav active="settings" />

        <PrototypeFolderCard
          active="settings"
          title="Settings"
          description="Manage the units and pantry locations everyone in the household shares. Changes apply everywhere under Nutrition."
        >
          <PantryFieldSettings units={units} locations={locations} />
        </PrototypeFolderCard>
      </main>
    </>
  );
}
