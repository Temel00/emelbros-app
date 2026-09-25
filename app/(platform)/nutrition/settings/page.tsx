import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";

import { NutritionNav } from "@/modules/nutrition/components/nutrition-nav";
import { PantryFieldSettings } from "@/modules/nutrition/components/pantry-field-settings";
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

        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage the units and pantry locations everyone in the household
            shares. Changes apply everywhere under Nutrition.
          </p>
        </div>

        <PantryFieldSettings units={units} locations={locations} />

        {/* CC BY 3.0 credit for the flair-layer art (#185, ADR-0018). */}
        <p className="text-xs text-muted-foreground">
          Background illustrations by Lorc, Delapouite &amp; contributors at{" "}
          <a
            href="https://game-icons.net"
            className="underline underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            game-icons.net
          </a>
          , licensed{" "}
          <a
            href="https://creativecommons.org/licenses/by/3.0/"
            className="underline underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            CC BY 3.0
          </a>
          .
        </p>
      </main>
    </>
  );
}
