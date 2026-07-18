import type { SupabaseClient } from "@supabase/supabase-js";

import type { ThrownDart } from "@/modules/darts/lib/engine";
import {
  assembleCompletedGames,
  type CompletedGame,
} from "@/modules/darts/lib/stats";
import type { Database } from "@/types/database";

export type DartsGameRow = Database["public"]["Tables"]["darts_game"]["Row"];
export type DartsParticipantRow =
  Database["public"]["Tables"]["darts_participant"]["Row"];
export type DartsTurnRow = Database["public"]["Tables"]["darts_turn"]["Row"];
export type DartsDartRow = Database["public"]["Tables"]["darts_dart"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

// Local aliases so the rest of this file (predating the reads/UI added for
// #31) can keep using the short names.
type DartsGame = DartsGameRow;
type DartsParticipant = DartsParticipantRow;
type DartsTurn = DartsTurnRow;
type DartsDart = DartsDartRow;

/** A turn with its darts in throw order — the shape the live-scoring UI
 * replays into `computeGameState`'s flat dart list on page load. */
export type TurnWithDarts = DartsTurn & { darts: DartsDart[] };

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

/**
 * Reads a single game by id (the live-scoring page's initial load). `null`
 * for a game that doesn't exist or that RLS hides — the same response
 * either way, so a missing id never leaks which case it was.
 */
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

/**
 * Every member profile — the pool the New game form picks players from
 * (darts.md §3) and the roster the leaderboard renders (darts.md §7: the
 * trophy case is open to all five members).
 */
export async function getProfiles(
  supabase: SupabaseClient<Database>,
): Promise<ProfileRow[]> {
  const { data, error } = await supabase.from("profiles").select("*");

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

/** A game's two participant rows, in slot order (the live-scoring page's initial load). */
export async function getParticipants(
  supabase: SupabaseClient<Database>,
  gameId: string,
): Promise<DartsParticipant[]> {
  const { data, error } = await supabase
    .from("darts_participant")
    .select("*")
    .eq("game_id", gameId)
    .order("slot", { ascending: true });

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

/**
 * A game's resolved turns and their darts, in play order (the live-scoring
 * page's initial load — replayed into `computeGameState`'s flat dart list).
 * Only ever the turns that have actually been persisted: a turn is written
 * once it resolves (bust, checkout, or three darts), so an in-progress
 * turn's darts live only in the client's local state until then.
 */
export async function getTurnsWithDarts(
  supabase: SupabaseClient<Database>,
  gameId: string,
): Promise<TurnWithDarts[]> {
  const { data, error } = await supabase
    .from("darts_turn")
    .select("*, darts:darts_dart(*)")
    .eq("game_id", gameId)
    .order("turn_number", { ascending: true });

  if (error) throw error;
  return data.map((turn) => ({
    ...turn,
    darts: [...turn.darts].sort((a, b) => a.dart_number - b.dart_number),
  }));
}

/**
 * Deletes a single persisted turn (cascades to its darts). Undo stepping
 * back across a turn boundary (darts.md §3) reopens that turn locally by
 * removing its persisted record — the engine recomputes the reopened state
 * from the shortened dart list, and the turn is re-persisted (possibly with
 * different darts) once it resolves again.
 */
export async function deleteTurn(
  supabase: SupabaseClient<Database>,
  turnId: string,
): Promise<void> {
  const { error } = await supabase.from("darts_turn").delete().eq("id", turnId);

  if (error) throw error;
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
