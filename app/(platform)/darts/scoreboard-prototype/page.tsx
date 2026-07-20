import { Suspense } from "react";

import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import { PrototypeScoringHarness } from "@/modules/darts/components/prototype-scoring-harness";

/**
 * PROTOTYPE ONLY — throwaway route. Delete when wayfinder #74 resolves.
 *
 * Five scoring-input shapes, switchable via `?variant=`, mounted in the same
 * shell as the live game route (`app/(platform)/darts/[id]`) — same header,
 * same `max-w-md` column, same padding — so the vertical budget is honest.
 *
 * It is its own route rather than a `?variant=` branch on the real game page
 * because scoring on the real page writes turns to the database; this needs
 * to be hammered, on a phone, without leaving junk games behind.
 */
export default async function ScoreboardPrototypePage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>;
}) {
  const { variant } = await searchParams;

  const member = await getCurrentMember();
  if (!member) return null;

  const supabase = await createClient();

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4 sm:p-6">
        <Suspense>
          <PrototypeScoringHarness variant={variant ?? "0"} />
        </Suspense>
      </main>
    </>
  );
}
