import { notFound } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import { getCompletedGameDetail, getGame } from "@/modules/darts/queries";
import { GameDetail } from "@/modules/darts/components/game-detail";

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
  // RLS returns no row for a game the caller can't see — same response as a
  // game that doesn't exist (mirrors app/(platform)/lists/[id]/page.tsx).
  if (!game) notFound();

  if (game.status !== "completed") {
    return (
      <>
        <AppHeader memberId={member.id} supabase={supabase} />
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 sm:p-6">
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            This game is still in progress. Live scoring lands with #31.
          </p>
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
