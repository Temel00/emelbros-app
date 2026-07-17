import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type DartsGame = Database["public"]["Tables"]["darts_game"]["Row"];
type DartsParticipant =
  Database["public"]["Tables"]["darts_participant"]["Row"];
type DartsTurn = Database["public"]["Tables"]["darts_turn"]["Row"];
type DartsDart = Database["public"]["Tables"]["darts_dart"]["Row"];

/** A player is either a member (gets a career record) or a free-text guest (darts.md §1). */
export type NewParticipant =
  | { memberId: string; guestName?: undefined }
  | { memberId?: undefined; guestName: string };

/**
 * The darts module's query layer (ADR-0009): unwraps `{ data, error }` and
 * throws on `error`, so callers never branch on Supabase's error shape. Each
 * function is one query — orchestrating a full "start a game" or "record a
 * turn" flow (create game, then participants, then set the starting
 * participant; or record a turn, then its darts) is the caller's job.
 */

/** Creates the game row (darts.md §4). Starts `in_progress` with no starting participant set yet. */
export async function createGame(
  supabase: SupabaseClient<Database>,
  game: { ownerMemberId: string; variant: 301 | 501 },
): Promise<DartsGame> {
  const { data, error } = await supabase
    .from("darts_game")
    .insert({ owner_member_id: game.ownerMemberId, variant: game.variant })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Inserts the game's two participant rows (slot 1 and slot 2). */
export async function createParticipants(
  supabase: SupabaseClient<Database>,
  gameId: string,
  players: [NewParticipant, NewParticipant],
): Promise<DartsParticipant[]> {
  const { data, error } = await supabase
    .from("darts_participant")
    .insert([
      {
        game_id: gameId,
        slot: 1,
        member_id: players[0].memberId ?? null,
        guest_name: players[0].guestName ?? null,
      },
      {
        game_id: gameId,
        slot: 2,
        member_id: players[1].memberId ?? null,
        guest_name: players[1].guestName ?? null,
      },
    ])
    .select();

  if (error) throw error;
  return data;
}

/** Records which participant throws first (darts.md §3 setup). */
export async function setStartingParticipant(
  supabase: SupabaseClient<Database>,
  gameId: string,
  participantId: string,
): Promise<DartsGame> {
  const { data, error } = await supabase
    .from("darts_game")
    .update({ starting_participant_id: participantId })
    .eq("id", gameId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Writes one finished turn (the engine has already decided it busted, checked out, or ran three darts). */
export async function recordTurn(
  supabase: SupabaseClient<Database>,
  turn: {
    gameId: string;
    participantId: string;
    turnNumber: number;
    busted: boolean;
  },
): Promise<DartsTurn> {
  const { data, error } = await supabase
    .from("darts_turn")
    .insert({
      game_id: turn.gameId,
      participant_id: turn.participantId,
      turn_number: turn.turnNumber,
      busted: turn.busted,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Writes a turn's darts in throw order (darts.md §4). */
export async function recordDarts(
  supabase: SupabaseClient<Database>,
  turnId: string,
  darts: { segment: number; multiple: number }[],
): Promise<DartsDart[]> {
  const { data, error } = await supabase
    .from("darts_dart")
    .insert(
      darts.map((dart, index) => ({
        turn_id: turnId,
        dart_number: index + 1,
        segment: dart.segment,
        multiple: dart.multiple,
      })),
    )
    .select();

  if (error) throw error;
  return data;
}

/** Completes a game on checkout: records the winner and freezes it (darts.md §3, immutable after). */
export async function completeGame(
  supabase: SupabaseClient<Database>,
  gameId: string,
  winnerParticipantId: string,
): Promise<DartsGame> {
  const { data, error } = await supabase
    .from("darts_game")
    .update({
      status: "completed",
      winner_participant_id: winnerParticipantId,
      completed_at: new Date().toISOString(),
    })
    .eq("id", gameId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Hard-deletes a game (cascades to its participants/turns/darts). Used both
 * to abandon a game mid-play and to delete a completed one (darts.md §3,
 * §6) — the operation is identical; RLS decides who is allowed to call it.
 */
export async function deleteGame(
  supabase: SupabaseClient<Database>,
  gameId: string,
): Promise<void> {
  const { error } = await supabase.from("darts_game").delete().eq("id", gameId);

  if (error) throw error;
}
