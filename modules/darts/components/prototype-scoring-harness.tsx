"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #74 resolves.
 *
 * Hosts the five scoring-input shapes inside a faithful copy of the live
 * scoring column (player cards → this-turn row → input → turn history), so
 * each shape is judged against the real vertical budget on a phone rather
 * than floating in a vacuum.
 *
 * State is in-memory and runs through the *real* engine (`computeGameState`),
 * so bust, checkout and the checkout glow all behave for real — but nothing
 * is persisted and no server action is called. That is deliberate: the
 * question is "what shape should the input be", not "does recordTurn work",
 * and it means you can hammer the board without leaving junk games behind.
 */

import { useState } from "react";

import { cn } from "@/lib/utils";
import { PrototypeSwitcher } from "@/components/prototype/prototype-switcher";
import { SCORING_VARIANTS } from "@/modules/darts/components/prototype-scoring-inputs";
import {
  checkoutDartTarget,
  computeGameState,
  dartValue,
  undoLastDart,
  type PlayerIndex,
  type ThrownDart,
} from "@/modules/darts/lib/engine";

function dartLabel(dart: ThrownDart): string {
  if (dart.segment === 0) return "—";
  if (dart.segment === 50) return "Bull";
  if (dart.segment === 25) return "25";
  return (
    (dart.multiple === 3 ? "T" : dart.multiple === 2 ? "D" : "") + dart.segment
  );
}

const PLAYERS = ["You", "Guest"] as const;

/** Jump straight to a score worth seeing, so the checkout glow can be judged without playing a leg. */
const SCENARIOS = [
  { label: "501", score: 501 },
  { label: "170", score: 170 },
  { label: "40 (D20 out)", score: 40 },
  { label: "50 (bull out)", score: 50 },
];

export function PrototypeScoringHarness({ variant }: { variant: string }) {
  const [startingScore, setStartingScore] = useState(501);
  const [darts, setDarts] = useState<ThrownDart[]>([]);

  const config = { startingScore, startingPlayer: 0 as PlayerIndex };
  const state = computeGameState(darts, config);
  const disabled = state.status !== "in_progress";

  const active =
    SCORING_VARIANTS.find((v) => v.key === variant) ?? SCORING_VARIANTS[0];
  const Input = active.Component;

  const checkoutTarget =
    state.status === "in_progress"
      ? checkoutDartTarget(state.scores[state.currentPlayer])
      : null;

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

  function reset(score: number) {
    setStartingScore(score);
    setDarts([]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-dashed border-c-pink/60 p-3">
        <p className="text-[10px] font-black tracking-widest text-c-pink uppercase">
          Prototype — wayfinder #74
        </p>
        <p className="mt-1 text-sm font-bold">{active.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{active.note}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SCENARIOS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => reset(s.score)}
              className={cn(
                "rounded-full border border-border bg-card px-3 py-1 text-xs font-bold",
                startingScore === s.score && "border-c-pink text-c-pink",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {([0, 1] as const).map((index) => {
          const isActive =
            state.currentPlayer === index && state.status === "in_progress";
          return (
            <div
              key={index}
              className={cn(
                "relative overflow-hidden rounded-xl border border-border bg-card p-3",
                isActive && "ring-2 ring-primary",
              )}
            >
              <div className="flex items-center gap-2 text-sm font-bold">
                <span className="truncate">{PLAYERS[index]}</span>
              </div>
              <div className="mt-1 text-4xl font-black tabular-nums">
                {state.scores[index]}
              </div>
              <div className="min-h-4 text-xs font-bold text-primary">
                {isActive && checkoutTarget
                  ? `Checkout ${dartLabel(checkoutTarget)}`
                  : " "}
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
              {state.currentTurnDarts[i]
                ? dartLabel(state.currentTurnDarts[i])
                : ""}
            </div>
          ))}
        </div>
        <span className="font-bold text-muted-foreground">
          this turn{" "}
          {state.currentTurnDarts.reduce((sum, d) => sum + dartValue(d), 0)}
        </span>
      </div>

      <Input
        disabled={disabled}
        checkoutTarget={checkoutTarget}
        onThrow={(dart) => setDarts((prev) => [...prev, dart])}
      />

      <div className="rounded-lg border border-border bg-card p-2">
        <h3 className="mb-1.5 flex items-center justify-between text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          <span>Turn history</span>
          <span>
            {historyTurns.length > 0 ? `${historyTurns.length} turns` : ""}
          </span>
        </h3>
        {historyTurns.length === 0 ? (
          <p className="p-1 text-xs text-muted-foreground">
            No darts yet — tap to start scoring.
          </p>
        ) : (
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {historyTurns.map((turn, i) => (
              <li
                key={i}
                className={cn(
                  "min-w-16 shrink-0 rounded-lg bg-muted px-2 py-1.5 opacity-70",
                  "current" in turn &&
                    turn.current &&
                    "opacity-100 ring-1 ring-inset ring-primary/40",
                )}
              >
                <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-muted-foreground">
                  <span className="truncate">{PLAYERS[turn.player]}</span>
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
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-2 pb-16">
        <button
          type="button"
          disabled={darts.length === 0}
          onClick={() => setDarts((prev) => undoLastDart(prev))}
          className="flex-1 rounded-lg border border-border bg-card px-4 py-2 text-sm font-bold disabled:opacity-40"
        >
          ↶ Undo
        </button>
        <button
          type="button"
          onClick={() => reset(startingScore)}
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-bold"
        >
          Reset leg
        </button>
      </div>

      <PrototypeSwitcher
        variants={SCORING_VARIANTS.map((v) => ({ key: v.key, name: v.name }))}
        current={active.key}
      />
    </div>
  );
}
