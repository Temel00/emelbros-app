import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { participantLabel } from "@/modules/darts/lib/labels";
import { summarizeMyDarts } from "@/modules/darts/lib/stats";
import { getCompletedGames } from "@/modules/darts/queries";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";

/**
 * The "My Darts" dashboard widget (darts.md §9, ADR-0005): a zero-prop Server
 * Component about the current member. It fetches its own data via the module's
 * `queries.ts` and the platform current-member helper — the dashboard passes
 * it nothing — and shows the member's recent record, most recent completed
 * game, and a New game shortcut into the module. The platform widget frame
 * owns the card chrome and the "My Darts" heading, so this renders only the
 * body.
 */
export async function MyDartsWidget() {
  const member = await getCurrentMember();
  if (!member) return null;

  const supabase = await createClient();
  const games = await getCompletedGames(supabase);
  const { recent, mostRecent } = summarizeMyDarts(games, member.id, 10);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-end">
        <Link
          href="/darts/new"
          className={buttonVariants({ size: "sm", variant: "outline" })}
        >
          New game
        </Link>
      </div>

      {recent.played === 0 ? (
        <p className="text-sm text-muted-foreground">
          No games yet — start one to build your record.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums">
              {recent.wins}
              <span className="text-muted-foreground">–</span>
              {recent.losses}
            </span>
            <span className="text-xs text-muted-foreground">
              last {recent.played} {recent.played === 1 ? "game" : "games"}
            </span>
          </div>

          {mostRecent && (
            <Link
              href={`/darts/${mostRecent.gameId}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              Last game:{" "}
              <span className="font-medium text-foreground">
                {mostRecent.won ? "Won" : "Lost"}
              </span>{" "}
              vs{" "}
              {mostRecent.opponent
                ? participantLabel(mostRecent.opponent)
                : "Unknown"}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
