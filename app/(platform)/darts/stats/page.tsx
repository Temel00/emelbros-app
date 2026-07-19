import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import { getCompletedGames, getProfiles } from "@/modules/darts/queries";
import {
  computeCareerRecord,
  computeHeadToHead,
} from "@/modules/darts/lib/stats";
import { memberLabel } from "@/modules/darts/lib/labels";
import {
  Leaderboard,
  type LeaderboardRow,
} from "@/modules/darts/components/leaderboard";

/**
 * The stats / leaderboard page (darts.md §5, §10): every member's career
 * record and head-to-head numbers, open to all members regardless of who's
 * signed in — darts is fixed Family scope (darts.md §7).
 */
export default async function DartsStatsPage() {
  const member = await getCurrentMember();
  // The proxy (ADR-0011) redirects signed-out requests to /sign-in before
  // this component ever runs.
  if (!member) return null;

  const supabase = await createClient();
  const [games, profiles] = await Promise.all([
    getCompletedGames(supabase),
    getProfiles(supabase),
  ]);

  const labelById = new Map(profiles.map((p) => [p.id, memberLabel(p.id)]));

  const rows: LeaderboardRow[] = profiles
    .map((profile) => {
      const record = computeCareerRecord(games, profile.id);
      const headToHead = computeHeadToHead(games, profile.id).map((h2h) => ({
        ...h2h,
        opponentLabel:
          labelById.get(h2h.opponentMemberId) ??
          memberLabel(h2h.opponentMemberId),
      }));

      return {
        memberId: profile.id,
        label: memberLabel(profile.id),
        accent: profile.accent,
        record,
        headToHead,
      };
    })
    .sort(
      (a, b) =>
        b.record.wins - a.record.wins || b.record.winPct - a.record.winPct,
    );

  return (
    <>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-4 sm:p-6">
        <Leaderboard rows={rows} />
      </main>
    </>
  );
}
