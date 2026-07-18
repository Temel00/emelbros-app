"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ACCENT_BG } from "@/lib/accent";
import { cn } from "@/lib/utils";
import {
  abandonGameAction,
  recordTurnAction,
  undoTurnAction,
} from "@/modules/darts/actions";
import { Dartboard } from "@/modules/darts/components/dartboard";
import {
  checkoutDartTarget,
  computeGameState,
  dartValue,
  undoLastDart,
  type PlayerIndex,
  type ThrownDart,
} from "@/modules/darts/lib/engine";
import { shortMemberLabel } from "@/modules/darts/lib/member-label";

import type {
  DartsGameRow,
  DartsParticipantRow,
  ProfileRow,
  TurnWithDarts,
} from "@/modules/darts/queries";

function dartLabel(dart: ThrownDart): string {
  if (dart.segment === 0) return "—";
  if (dart.segment === 50) return "Bull";
  if (dart.segment === 25) return "25";
  return (dart.multiple === 3 ? "T" : dart.multiple === 2 ? "D" : "") + dart.segment;
}

function playerLabel(
  participant: DartsParticipantRow,
  profiles: Map<string, ProfileRow>,
): { text: string; accentClass: string | null } {
  if (participant.guest_name) {
    return { text: participant.guest_name, accentClass: null };
  }
  const profile = participant.member_id ? profiles.get(participant.member_id) : undefined;
  return {
    text: participant.member_id ? shortMemberLabel(participant.member_id) : "Unknown",
    accentClass: profile ? ACCENT_BG[profile.accent] : null,
  };
}

/**
 * The live-scoring screen (darts.md §3, prototype #7): per-dart entry on the
 * dartboard-shaped calculator, running scores, checkout-double glow, a
 * scrollable turn history, Undo (unlimited, across turn/player boundaries),
 * and Abandon.
 *
 * The darts thrown so far live as one flat, ordered client-side array — the
 * same shape `computeGameState` (lib/engine.ts) replays into scores/turns/
 * bust/checkout. Only *resolved* turns (bust, checkout, or three darts) are
 * written to the database, one round trip per turn (`recordTurnAction`);
 * the in-progress turn's darts exist only in memory until it resolves. Undo
 * within an unresolved turn is a pure local pop; undo stepping back into an
 * already-persisted turn deletes that turn server-side (`undoTurnAction`)
 * before popping — engine.ts's own comment is explicit that enforcing "no
 * undo past a completed, persisted game" is this UI's job, not the engine's.
 */
export function LiveGame({
  game,
  participants,
  initialTurns,
  profiles,
  currentMemberId,
}: {
  game: DartsGameRow;
  participants: [DartsParticipantRow, DartsParticipantRow];
  initialTurns: TurnWithDarts[];
  profiles: ProfileRow[];
  currentMemberId: string;
}) {
  const router = useRouter();
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const startingPlayer: PlayerIndex =
    participants[1].id === game.starting_participant_id ? 1 : 0;
  const config = { startingScore: game.variant, startingPlayer };

  const initialDarts: ThrownDart[] = initialTurns.flatMap((turn) =>
    turn.darts.map((d) => ({ segment: d.segment, multiple: d.multiple as 1 | 2 | 3 })),
  );

  const [darts, setDarts] = useState<ThrownDart[]>(initialDarts);
  const [persistedTurnIds, setPersistedTurnIds] = useState<string[]>(
    initialTurns.map((t) => t.id),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bust = toast, checkout = overlay (darts.md §3) — the toast only ever carries a bust message.
  const [toast, setToast] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(game.status === "completed");
  const [, startTransition] = useTransition();
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOwner = currentMemberId === game.owner_member_id;
  const state = computeGameState(darts, config);
  const disabled = !isOwner || state.status !== "in_progress" || pending;

  useEffect(() => {
    return () => {
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
    };
  }, []);

  function showBustToast(message: string) {
    setToast(message);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 2200);
  }

  function label(index: PlayerIndex) {
    return playerLabel(participants[index], profileMap);
  }

  function handleThrow(dart: ThrownDart) {
    if (disabled) return;

    const nextDarts = [...darts, dart];
    const nextState = computeGameState(nextDarts, config);
    setDarts(nextDarts);

    if (nextState.turns.length === state.turns.length) return;

    const turn = nextState.turns[nextState.turns.length - 1];
    const participant = participants[turn.player];
    const checkoutWinnerParticipantId =
      nextState.status === "completed" && nextState.winner !== null
        ? participants[nextState.winner].id
        : undefined;

    setPending(true);
    startTransition(async () => {
      try {
        const { turnId } = await recordTurnAction({
          gameId: game.id,
          participantId: participant.id,
          turnNumber: turn.turnNumber,
          busted: turn.busted,
          darts: turn.darts,
          checkoutWinnerParticipantId,
        });
        setPersistedTurnIds((prev) => [...prev, turnId]);
        if (turn.busted) {
          showBustToast(`BUST — ${label(turn.player).text} stays on ${turn.scoreBefore}`);
        } else if (checkoutWinnerParticipantId) {
          setShowOverlay(true);
        }
      } catch (err) {
        setDarts(darts);
        setError(err instanceof Error ? err.message : "Couldn't save that turn");
      } finally {
        setPending(false);
      }
    });
  }

  function handleUndo() {
    if (!isOwner || pending || darts.length === 0 || state.status !== "in_progress") {
      return;
    }

    const nextDarts = undoLastDart(darts);
    const nextState = computeGameState(nextDarts, config);

    if (nextState.turns.length === state.turns.length) {
      setDarts(nextDarts);
      return;
    }

    const turnId = persistedTurnIds[persistedTurnIds.length - 1];
    setPending(true);
    startTransition(async () => {
      try {
        await undoTurnAction(game.id, turnId);
        setPersistedTurnIds((prev) => prev.slice(0, -1));
        setDarts(nextDarts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't undo that dart");
      } finally {
        setPending(false);
      }
    });
  }

  function handleAbandon() {
    if (!isOwner) return;
    if (!window.confirm("Abandon this game? It's discarded entirely — this can't be undone.")) {
      return;
    }
    startTransition(async () => {
      try {
        await abandonGameAction(game.id);
        router.push("/darts");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't abandon the game");
      }
    });
  }

  const checkoutTarget =
    state.status === "in_progress" ? checkoutDartTarget(state.scores[state.currentPlayer]) : null;

  const historyTurns = [
    ...state.turns,
    ...(state.status === "in_progress" && state.currentTurnDarts.length > 0
      ? [
          {
            turnNumber: state.turns.length + 1,
            player: state.currentPlayer,
            darts: state.currentTurnDarts,
            scoreBefore: state.scores[state.currentPlayer],
            scoreAfter: state.scores[state.currentPlayer],
            busted: false,
            checkout: false,
            current: true,
          },
        ]
      : []),
  ];

  const winnerDartsThrown =
    state.winner !== null
      ? state.turns.filter((t) => t.player === state.winner).reduce((sum, t) => sum + t.darts.length, 0)
      : 0;

  return (
    <div className="flex flex-col gap-4">
      {toast && (
        <div
          role="status"
          className="fixed top-16 left-1/2 z-30 -translate-x-1/2 rounded-full bg-c-yellow px-4 py-2 text-sm font-semibold text-[#3a2c00] shadow-lg"
        >
          {toast}
        </div>
      )}

      {!isOwner && (
        <p className="rounded-lg border border-dashed border-border p-3 text-center text-sm text-muted-foreground">
          Only the tracker who started this game can score it.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {([0, 1] as const).map((index) => {
          const { text, accentClass } = label(index);
          const active = state.currentPlayer === index && state.status === "in_progress";
          return (
            <div
              key={index}
              className={cn(
                "relative overflow-hidden rounded-xl border border-border bg-card p-3",
                active && "ring-2 ring-primary",
              )}
            >
              <div className="flex items-center gap-2 text-sm font-bold">
                {accentClass && <span aria-hidden className={cn("size-2.5 rounded-full", accentClass)} />}
                <span className="truncate">{text}</span>
              </div>
              <div className="mt-1 text-4xl font-black tabular-nums">{state.scores[index]}</div>
              <div className="min-h-4 text-xs font-bold text-primary">
                {state.status === "in_progress" && state.currentPlayer === index && checkoutTarget
                  ? `Checkout ${dartLabel(checkoutTarget)}`
                  : " "}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2 text-sm">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "flex h-9 min-w-13 items-center justify-center rounded-lg border text-sm font-bold",
                state.currentTurnDarts[i]
                  ? "border-transparent bg-muted"
                  : "border-dashed border-border text-muted-foreground",
              )}
            >
              {state.currentTurnDarts[i] ? dartLabel(state.currentTurnDarts[i]) : ""}
            </div>
          ))}
        </div>
        <span className="font-bold text-muted-foreground">
          this turn {state.currentTurnDarts.reduce((sum, d) => sum + dartValue(d), 0)}
        </span>
      </div>

      <Dartboard disabled={disabled} checkoutTarget={checkoutTarget} onThrow={handleThrow} />

      <div className="rounded-lg border border-border bg-card p-2">
        <h3 className="mb-1.5 flex items-center justify-between text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          <span>Turn history</span>
          <span>{historyTurns.length > 0 ? `${historyTurns.length} turns` : ""}</span>
        </h3>
        {historyTurns.length === 0 ? (
          <p className="p-1 text-xs text-muted-foreground">No darts yet — tap the board to start scoring.</p>
        ) : (
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {historyTurns.map((turn, i) => {
              const { text } = label(turn.player);
              return (
                <li
                  key={i}
                  className={cn(
                    "min-w-16 shrink-0 rounded-lg bg-muted px-2 py-1.5 opacity-70",
                    "current" in turn && turn.current && "opacity-100 ring-1 ring-inset ring-primary/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-muted-foreground">
                    <span className="truncate">{text}</span>
                    {turn.checkout && <span>🏆</span>}
                    {turn.busted && <span>BUST</span>}
                  </div>
                  <div
                    className={cn(
                      "text-lg font-black tabular-nums",
                      turn.busted && "text-muted-foreground line-through",
                    )}
                  >
                    {turn.busted ? 0 : turn.scoreBefore - turn.scoreAfter}
                  </div>
                  <div
                    className={cn(
                      "text-[10px] font-bold whitespace-nowrap text-muted-foreground",
                      turn.busted && "line-through",
                    )}
                  >
                    {turn.darts.map(dartLabel).join(" · ") || "—"}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isOwner && state.status === "in_progress" && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={pending || darts.length === 0}
            onClick={handleUndo}
          >
            ↶ Undo
          </Button>
          <Button variant="destructive" disabled={pending} onClick={handleAbandon}>
            Abandon
          </Button>
        </div>
      )}

      {showOverlay && state.status === "completed" && state.winner !== null && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 text-center shadow-2xl">
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
              Game over · double-out
            </p>
            <p className="my-1.5 text-2xl font-black">{label(state.winner).text} wins!</p>
            <p className="mb-4 font-bold text-muted-foreground">{winnerDartsThrown} darts thrown</p>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => router.push("/darts")}>
                New game
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => setShowOverlay(false)}>
                View board
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
