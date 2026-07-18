"use server";

import { revalidatePath } from "next/cache";

import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import type { ThrownDart } from "@/modules/darts/lib/engine";
import {
  completeGame,
  createGame,
  createParticipants,
  deleteGame,
  deleteTurn,
  recordDarts,
  recordTurn,
  setStartingParticipant,
  type NewParticipant,
} from "@/modules/darts/queries";

/**
 * Server actions behind the darts UI — game setup and live scoring (darts.md
 * §3, #31) plus deleting a completed game (darts.md §6, #32). Every write
 * rides RLS (darts.md §7): only the tracker (game owner) can score or abandon
 * a game, and only the owner or a member participant can delete one — these
 * actions don't re-check that themselves, a disallowed request just comes
 * back as a Postgres RLS error.
 */
async function requireMember() {
  const member = await getCurrentMember();
  if (!member) throw new Error("Not signed in");
  return member;
}

/**
 * Starts a game: the game row, both participants, and who throws first, in
 * one flow (darts.md §3 setup). The tracker (current member) is recorded as
 * the owner regardless of whether they're one of the two players.
 */
export async function createGameAction(input: {
  variant: 301 | 501;
  player1: NewParticipant;
  player2: NewParticipant;
  startingSlot: 1 | 2;
}): Promise<{ gameId: string }> {
  const member = await requireMember();
  const supabase = await createClient();

  const game = await createGame(supabase, {
    ownerMemberId: member.id,
    variant: input.variant,
  });
  const participants = await createParticipants(supabase, game.id, [
    input.player1,
    input.player2,
  ]);
  const starting = participants.find((p) => p.slot === input.startingSlot);
  if (!starting) throw new Error("Starting participant not found");
  await setStartingParticipant(supabase, game.id, starting.id);

  revalidatePath("/darts");
  return { gameId: game.id };
}

/**
 * Persists one resolved turn (bust, checkout, or three darts — the engine
 * has already decided which) and, on checkout, completes the game in the
 * same round trip so the win lands atomically with the finishing turn.
 */
export async function recordTurnAction(input: {
  gameId: string;
  participantId: string;
  turnNumber: number;
  busted: boolean;
  darts: ThrownDart[];
  checkoutWinnerParticipantId?: string;
}): Promise<{ turnId: string }> {
  await requireMember();
  const supabase = await createClient();

  const turn = await recordTurn(supabase, {
    gameId: input.gameId,
    participantId: input.participantId,
    turnNumber: input.turnNumber,
    busted: input.busted,
  });
  await recordDarts(supabase, turn.id, input.darts);
  if (input.checkoutWinnerParticipantId) {
    await completeGame(supabase, input.gameId, input.checkoutWinnerParticipantId);
  }

  revalidatePath(`/darts/${input.gameId}`);
  return { turnId: turn.id };
}

/**
 * Undo stepping back across a turn boundary (darts.md §3): deletes the
 * persisted turn the tracker is stepping back into, reopening it for local
 * re-entry.
 */
export async function undoTurnAction(gameId: string, turnId: string) {
  await requireMember();
  const supabase = await createClient();

  await deleteTurn(supabase, turnId);
  revalidatePath(`/darts/${gameId}`);
}

/** Abandons a game mid-play: hard delete, discards it entirely (darts.md §3). */
export async function abandonGameAction(gameId: string) {
  await requireMember();
  const supabase = await createClient();

  await deleteGame(supabase, gameId);
  revalidatePath("/darts");
}

/**
 * Deletes a completed game (darts.md §6). Same hard delete as abandoning,
 * but reached from the history/detail views, so it also refreshes the recent
 * list, the leaderboard, and the game's own page.
 */
export async function deleteGameAction(gameId: string) {
  await requireMember();
  const supabase = await createClient();

  await deleteGame(supabase, gameId);

  revalidatePath("/darts");
  revalidatePath("/darts/stats");
  revalidatePath(`/darts/${gameId}`);
}
