import type { SupabaseClient } from "@supabase/supabase-js";

import type { ThrownDart } from "@/modules/darts/lib/engine";
import {
  assembleCompletedGames,
  type CompletedGame,
} from "@/modules/darts/lib/stats";
import type { Database } from "@/types/database";

type DartsGame = Database["public"]["Tables"]["darts_game"]["Row"];
type DartsParticipant =
  Database["public"]["Tables"]["darts_participant"]["Row"];
type DartsTurn = Database["public"]["Tables"]["darts_turn"]["Row"];
type DartsDart = Database["public"]["Tables"]["darts_dart"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

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
  darts: ThrownDart[],
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

export async function getGame(
  supabase: SupabaseClient<Database>,
  gameId: string,
): Promise<DartsGame | null> {
  const { data, error } = await supabase
    .from("darts_game")
    .select("*")
    .eq("id", gameId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Every completed game, most recently finished first (darts.md §5 reads across all completed games). */
async function getCompletedGameRows(
  supabase: SupabaseClient<Database>,
): Promise<DartsGame[]> {
  const { data, error } = await supabase
    .from("darts_game")
    .select("*")
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (error) throw error;
  return data;
}

async function getParticipantsForGames(
  supabase: SupabaseClient<Database>,
  gameIds: string[],
): Promise<DartsParticipant[]> {
  if (gameIds.length === 0) return [];

  const { data, error } = await supabase
    .from("darts_participant")
    .select("*")
    .in("game_id", gameIds);

  if (error) throw error;
  return data;
}

async function getTurnsForGames(
  supabase: SupabaseClient<Database>,
  gameIds: string[],
): Promise<DartsTurn[]> {
  if (gameIds.length === 0) return [];

  const { data, error } = await supabase
    .from("darts_turn")
    .select("*")
    .in("game_id", gameIds)
    .order("turn_number", { ascending: true });

  if (error) throw error;
  return data;
}

async function getDartsForTurns(
  supabase: SupabaseClient<Database>,
  turnIds: string[],
): Promise<DartsDart[]> {
  if (turnIds.length === 0) return [];

  const { data, error } = await supabase
    .from("darts_dart")
    .select("*")
    .in("turn_id", turnIds)
    .order("dart_number", { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Every completed game, fully assembled with its participants/turns/darts
 * (darts.md §5): the input to career-record, head-to-head, and game-detail
 * derivation (`modules/darts/lib/stats.ts`). Four flat queries plus a pure
 * join, rather than one nested `select`, to keep each query trivially typed
 * and testable (mirrors the habits module's `getLogsForTrackables` /
 * `getParticipantsForTrackables` split).
 */
export async function getCompletedGames(
  supabase: SupabaseClient<Database>,
): Promise<CompletedGame[]> {
  const games = await getCompletedGameRows(supabase);
  const gameIds = games.map((g) => g.id);

  const [participants, turns] = await Promise.all([
    getParticipantsForGames(supabase, gameIds),
    getTurnsForGames(supabase, gameIds),
  ]);
  const darts = await getDartsForTurns(
    supabase,
    turns.map((t) => t.id),
  );

  return assembleCompletedGames(games, participants, turns, darts);
}

/** One completed game, fully assembled for the game-detail page — `null` if it doesn't exist or isn't completed. */
export async function getCompletedGameDetail(
  supabase: SupabaseClient<Database>,
  gameId: string,
): Promise<CompletedGame | null> {
  const game = await getGame(supabase, gameId);
  if (!game || game.status !== "completed") return null;

  const [participants, turns] = await Promise.all([
    getParticipantsForGames(supabase, [gameId]),
    getTurnsForGames(supabase, [gameId]),
  ]);
  const darts = await getDartsForTurns(
    supabase,
    turns.map((t) => t.id),
  );

  const [detail] = assembleCompletedGames(
    [game],
    participants,
    turns,
    darts,
  );
  return detail ?? null;
}

/** Every member's profile (darts.md §7: the trophy case is open to all five members). */
export async function getAllProfiles(
  supabase: SupabaseClient<Database>,
): Promise<ProfileRow[]> {
  const { data, error } = await supabase.from("profiles").select("*");

  if (error) throw error;
  return data;
}
