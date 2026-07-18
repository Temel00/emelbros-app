import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import { NewGameForm } from "@/modules/darts/components/new-game-form";
import { getProfiles } from "@/modules/darts/queries";

/**
 * New game setup (darts.md §3, §10): pick the variant, both players, and who
 * throws first. Reached from the darts home's "New game" shortcut (#32);
 * starting a game (#31) hands off to the live-scoring board at /darts/[id].
 */
export default async function NewDartsGamePage() {
  const member = await getCurrentMember();
  // The proxy (ADR-0011) redirects signed-out requests to /sign-in before
  // this component ever runs.
  if (!member) return null;

  const supabase = await createClient();
  const profiles = await getProfiles(supabase);

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-6">
        <div>
          <h1 className="text-xl font-semibold">New game</h1>
          <p className="text-sm text-muted-foreground">
            Score a 501 or 301 game, dart by dart, on this device.
          </p>
        </div>

        <NewGameForm profiles={profiles} />
      </main>
    </>
  );
}
