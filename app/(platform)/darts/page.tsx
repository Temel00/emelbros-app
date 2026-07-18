import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import { getCompletedGames } from "@/modules/darts/queries";
import { DartsHome } from "@/modules/darts/components/darts-home";

export default async function DartsPage() {
  const member = await getCurrentMember();
  // The proxy (ADR-0011) redirects signed-out requests to /sign-in before
  // this component ever runs.
  if (!member) return null;

  const supabase = await createClient();
  const games = await getCompletedGames(supabase);
  const recentGames = games
    .filter((game) =>
      game.participants.some((p) => p.memberId === member.id),
    )
    .slice(0, 10);

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-4 sm:p-6">
        <DartsHome recentGames={recentGames} currentMemberId={member.id} />
      </main>
    </>
  );
}
