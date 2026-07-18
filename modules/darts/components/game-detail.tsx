"use client";

import { useRouter } from "next/navigation";

import { DeleteGameButton } from "@/modules/darts/components/delete-game-button";
import { participantLabel } from "@/modules/darts/lib/labels";
import { summarizeGame } from "@/modules/darts/lib/stats";

import type { CompletedGame } from "@/modules/darts/lib/stats";

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function dartLabel(dart: { segment: number; multiple: number }): string {
  if (dart.segment === 0) return "miss";
  if (dart.segment === 50) return "bull";
  if (dart.segment === 25) return "25";
  const prefix = dart.multiple === 3 ? "T" : dart.multiple === 2 ? "D" : "";
  return `${prefix}${dart.segment}`;
}

/**
 * A completed game's turn-by-turn history (darts.md §5, §10): each player's
 * darts, average, and checkout. Completed games are immutable — the only
 * write available here is delete (§6), which removes the game from both
 * players' records.
 */
export function GameDetail({
  game,
  canDelete,
}: {
  game: CompletedGame;
  canDelete: boolean;
}) {
  const router = useRouter();
  const summaries = summarizeGame(game);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">{game.variant} game</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(game.completedAt).toLocaleString()}
          </p>
        </div>
        {canDelete && (
          <DeleteGameButton
            gameId={game.id}
            onDeleted={() => router.push("/darts")}
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {game.participants
          .slice()
          .sort((a, b) => a.slot - b.slot)
          .map((participant) => {
            const summary = summaries.find(
              (s) => s.participantId === participant.id,
            );
            const won = game.winnerParticipantId === participant.id;

            return (
              <div
                key={participant.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{participantLabel(participant)}</p>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {won ? "Winner" : ""}
                  </span>
                </div>

                {summary && (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">3-dart average</dt>
                    <dd className="text-right tabular-nums">
                      {round(summary.average)}
                    </dd>
                    <dt className="text-muted-foreground">Darts thrown</dt>
                    <dd className="text-right tabular-nums">{summary.darts}</dd>
                    {summary.checkout !== null && (
                      <>
                        <dt className="text-muted-foreground">Checkout</dt>
                        <dd className="text-right tabular-nums">
                          {summary.checkout}
                        </dd>
                      </>
                    )}
                  </dl>
                )}

                <ol className="flex flex-col gap-1 border-t border-border pt-2 text-xs">
                  {summary?.turns.map((turn) => (
                    <li
                      key={turn.turnNumber}
                      className={
                        turn.busted
                          ? "flex justify-between text-muted-foreground line-through"
                          : "flex justify-between"
                      }
                    >
                      <span>{turn.darts.map((d) => dartLabel(d)).join(" ")}</span>
                      <span className="tabular-nums">{turn.points}</span>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
      </div>
    </div>
  );
}
