import { notFound } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";

import { LiveGame } from "@/modules/darts/components/live-game";
import {
  getGame,
  getParticipants,
  getProfiles,
  getTurnsWithDarts,
} from "@/modules/darts/queries";

/** The live-scoring screen's page (darts.md §10, #31): loads a game's current state and renders it. */
export default async function DartsGamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;

  const member = await getCurrentMember();
  // The proxy (ADR-0011) redirects signed-out requests to /sign-in before
  // this component ever runs.
  if (!member) return null;

  const supabase = await createClient();
  const game = await getGame(supabase, gameId);
  if (!game) notFound();

  const [participants, turns, profiles] = await Promise.all([
    getParticipants(supabase, game.id),
    getTurnsWithDarts(supabase, game.id),
    getProfiles(supabase),
  ]);
  if (participants.length !== 2) notFound();

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4 sm:p-6">
        <LiveGame
          game={game}
          participants={[participants[0], participants[1]]}
          initialTurns={turns}
          profiles={profiles}
          currentMemberId={member.id}
        />
      </main>
    </>
  );
}
