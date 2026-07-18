"use client";

import Link from "next/link";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { DeleteGameButton } from "@/modules/darts/components/delete-game-button";
import { participantLabel } from "@/modules/darts/lib/labels";

import type { CompletedGame } from "@/modules/darts/lib/stats";

/**
 * The darts module home (darts.md §10): a New game shortcut and the current
 * member's recent completed games. Game setup and live scoring are #31's;
 * this page only starts the entry point and reads history.
 */
export function DartsHome({
  recentGames,
  currentMemberId,
}: {
  recentGames: CompletedGame[];
  currentMemberId: string;
}) {
  const [games, setGames] = useState(recentGames);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Darts</h1>
        <Link href="/darts/new" className={buttonVariants({ size: "sm" })}>
          New game
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-muted-foreground">
            Recent games
          </h2>
          <Link
            href="/darts/stats"
            className="text-xs font-medium text-primary hover:underline"
          >
            Leaderboard
          </Link>
        </div>

        {games.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No games yet — start one to build your record.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {games.map((game) => {
              const self = game.participants.find(
                (p) => p.memberId === currentMemberId,
              );
              const opponent = game.participants.find(
                (p) => p.id !== self?.id,
              );
              const won = self ? game.winnerParticipantId === self.id : false;

              return (
                <li
                  key={game.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <Link
                    href={`/darts/${game.id}`}
                    className="flex-1 truncate text-sm font-medium hover:underline"
                  >
                    vs {opponent ? participantLabel(opponent) : "Unknown"}
                  </Link>
                  <span
                    className={
                      won
                        ? "text-xs font-semibold text-foreground"
                        : "text-xs font-semibold text-muted-foreground"
                    }
                  >
                    {won ? "W" : "L"}
                  </span>
                  <DeleteGameButton
                    gameId={game.id}
                    onDeleted={() =>
                      setGames((gs) => gs.filter((g) => g.id !== game.id))
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
