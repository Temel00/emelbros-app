import { notFound } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import { GameDetail } from "@/modules/darts/components/game-detail";
import { LiveGame } from "@/modules/darts/components/live-game";
import {
  getCompletedGameDetail,
  getGame,
  getParticipants,
  getProfiles,
  getTurnsWithDarts,
} from "@/modules/darts/queries";

/**
 * A single game's page (darts.md §10). One route, two faces: while the game
 * is in progress it's the live-scoring board (#31); once completed it's the
 * read-only detail view (#32). RLS returns no row for a game the caller
 * can't see — the same `notFound` as a game that doesn't exist, so a missing
 * id never leaks which case it was (mirrors app/(platform)/lists/[id]).
 */
export default async function DartsGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const member = await getCurrentMember();
  // The proxy (ADR-0011) redirects signed-out requests to /sign-in before
  // this component ever runs.
  if (!member) return null;

  const supabase = await createClient();
  const game = await getGame(supabase, id);
  if (!game) notFound();

  if (game.status !== "completed") {
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

  const detail = await getCompletedGameDetail(supabase, id);
  if (!detail) notFound();

  const canDelete =
    member.id === game.owner_member_id ||
    detail.participants.some((p) => p.memberId === member.id);

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-4 sm:p-6">
        <GameDetail game={detail} canDelete={canDelete} />
      </main>
    </>
  );
}
