/**
 * Read-time stat derivation from stored darts (darts.md §5): nothing
 * aggregate is stored, so career records, averages, checkouts, and
 * head-to-head are all computed here from completed games' turns and darts.
 * Pure and DB-shape-agnostic — `assembleCompletedGames` is the one seam that
 * knows about flat Supabase rows; everything downstream works off the
 * `CompletedGame` shape so it's testable without a database.
 */
import { dartValue, type ThrownDart } from "@/modules/darts/lib/engine";

export type GameParticipant = {
  id: string;
  memberId: string | null;
  guestName: string | null;
  slot: number;
};

export type GameTurn = {
  participantId: string;
  turnNumber: number;
  busted: boolean;
  darts: ThrownDart[];
};

export type CompletedGame = {
  id: string;
  variant: number;
  ownerMemberId: string;
  winnerParticipantId: string;
  completedAt: string;
  participants: GameParticipant[];
  turns: GameTurn[];
};

export type CareerRecord = {
  memberId: string;
  played: number;
  wins: number;
  losses: number;
  winPct: number;
  threeDartAverage: number;
  bestGameAverage: number;
  highestCheckout: number;
  highestTurn: number;
  /** Fewest darts thrown to win a game; `null` when the member has never won. */
  bestLeg: number | null;
  count180: number;
};

export type HeadToHead = {
  opponentMemberId: string;
  wins: number;
  losses: number;
};

/**
 * A turn's scored points: the sum of its darts' values, or 0 on a bust — a
 * busted turn's remaining score is unchanged (darts.md §1), so it scores
 * nothing even though darts were thrown.
 */
function turnPoints(turn: GameTurn): number {
  if (turn.busted) return 0;
  return turn.darts.reduce((sum, dart) => sum + dartValue(dart), 0);
}

/** Joins flat `darts_game`/`darts_participant`/`darts_turn`/`darts_dart` rows into nested `CompletedGame`s. */
export function assembleCompletedGames(
  games: {
    id: string;
    variant: number;
    owner_member_id: string;
    winner_participant_id: string | null;
    completed_at: string | null;
  }[],
  participants: {
    id: string;
    game_id: string;
    member_id: string | null;
    guest_name: string | null;
    slot: number;
  }[],
  turns: {
    id: string;
    game_id: string;
    participant_id: string;
    turn_number: number;
    busted: boolean;
  }[],
  darts: {
    turn_id: string;
    dart_number: number;
    segment: number;
    multiple: number;
  }[],
): CompletedGame[] {
  const dartsByTurn = new Map<string, ThrownDart[]>();
  for (const dart of [...darts].sort((a, b) => a.dart_number - b.dart_number)) {
    const list = dartsByTurn.get(dart.turn_id) ?? [];
    list.push({
      segment: dart.segment,
      multiple: dart.multiple as 1 | 2 | 3,
    });
    dartsByTurn.set(dart.turn_id, list);
  }

  const turnsByGame = new Map<string, GameTurn[]>();
  for (const turn of [...turns].sort((a, b) => a.turn_number - b.turn_number)) {
    const list = turnsByGame.get(turn.game_id) ?? [];
    list.push({
      participantId: turn.participant_id,
      turnNumber: turn.turn_number,
      busted: turn.busted,
      darts: dartsByTurn.get(turn.id) ?? [],
    });
    turnsByGame.set(turn.game_id, list);
  }

  const participantsByGame = new Map<string, GameParticipant[]>();
  for (const participant of participants) {
    const list = participantsByGame.get(participant.game_id) ?? [];
    list.push({
      id: participant.id,
      memberId: participant.member_id,
      guestName: participant.guest_name,
      slot: participant.slot,
    });
    participantsByGame.set(participant.game_id, list);
  }

  return games
    .filter((game): game is typeof game & { winner_participant_id: string } =>
      Boolean(game.winner_participant_id),
    )
    .map((game) => ({
      id: game.id,
      variant: game.variant,
      ownerMemberId: game.owner_member_id,
      winnerParticipantId: game.winner_participant_id,
      completedAt: game.completed_at ?? "",
      participants: participantsByGame.get(game.id) ?? [],
      turns: turnsByGame.get(game.id) ?? [],
    }));
}

/** A member's career record across completed games (darts.md §5). */
export function computeCareerRecord(
  games: CompletedGame[],
  memberId: string,
): CareerRecord {
  let played = 0;
  let wins = 0;
  let losses = 0;
  let totalPoints = 0;
  let totalDarts = 0;
  let bestGameAverage = 0;
  let highestCheckout = 0;
  let highestTurn = 0;
  let bestLeg: number | null = null;
  let count180 = 0;

  for (const game of games) {
    const participant = game.participants.find((p) => p.memberId === memberId);
    if (!participant) continue;

    const turns = game.turns
      .filter((t) => t.participantId === participant.id)
      .sort((a, b) => a.turnNumber - b.turnNumber);
    // Unreachable for a real completed game: 301/501 double-out means the
    // first turn can reduce at most 180, so a game can never finish before
    // both participants have thrown at least once. Guarded anyway so a
    // malformed row can't silently corrupt the aggregate below.
    if (turns.length === 0) continue;

    played++;
    const won = game.winnerParticipantId === participant.id;
    if (won) wins++;
    else losses++;

    let gamePoints = 0;
    let gameDarts = 0;
    for (const turn of turns) {
      const points = turnPoints(turn);
      gamePoints += points;
      gameDarts += turn.darts.length;
      if (points > highestTurn) highestTurn = points;
      if (points === 180) count180++;
    }
    totalPoints += gamePoints;
    totalDarts += gameDarts;

    if (gameDarts > 0) {
      const gameAverage = (gamePoints / gameDarts) * 3;
      if (gameAverage > bestGameAverage) bestGameAverage = gameAverage;
    }

    if (won) {
      const lastTurn = turns[turns.length - 1];
      const checkout = turnPoints(lastTurn);
      if (checkout > highestCheckout) highestCheckout = checkout;
      if (bestLeg === null || gameDarts < bestLeg) bestLeg = gameDarts;
    }
  }

  return {
    memberId,
    played,
    wins,
    losses,
    winPct: played === 0 ? 0 : wins / played,
    threeDartAverage: totalDarts === 0 ? 0 : (totalPoints / totalDarts) * 3,
    bestGameAverage,
    highestCheckout,
    highestTurn,
    bestLeg,
    count180,
  };
}

export type TurnSummary = {
  turnNumber: number;
  busted: boolean;
  points: number;
  darts: ThrownDart[];
};

export type ParticipantGameSummary = {
  participantId: string;
  darts: number;
  points: number;
  average: number;
  /** This participant's checkout value, or `null` — only the winner has one. */
  checkout: number | null;
  turns: TurnSummary[];
};

/** One completed game's turn-by-turn detail per player (darts.md §5's "individual game record"). */
export function summarizeGame(game: CompletedGame): ParticipantGameSummary[] {
  return game.participants.map((participant) => {
    const turns = game.turns
      .filter((t) => t.participantId === participant.id)
      .sort((a, b) => a.turnNumber - b.turnNumber)
      .map((t) => ({
        turnNumber: t.turnNumber,
        busted: t.busted,
        points: turnPoints(t),
        darts: t.darts,
      }));

    const points = turns.reduce((sum, t) => sum + t.points, 0);
    const darts = turns.reduce((sum, t) => sum + t.darts.length, 0);
    const won = game.winnerParticipantId === participant.id;

    return {
      participantId: participant.id,
      darts,
      points,
      average: darts === 0 ? 0 : (points / darts) * 3,
      checkout: won && turns.length > 0 ? turns[turns.length - 1].points : null,
      turns,
    };
  });
}

/**
 * A member's head-to-head record against each other member they've played
 * (darts.md §5): member-vs-member only, so a guest opponent never produces a
 * row — guest games still count toward the overall record and averages
 * above, just not here.
 */
export function computeHeadToHead(
  games: CompletedGame[],
  memberId: string,
): HeadToHead[] {
  const byOpponent = new Map<string, HeadToHead>();

  for (const game of games) {
    const self = game.participants.find((p) => p.memberId === memberId);
    if (!self) continue;

    const opponent = game.participants.find((p) => p.id !== self.id);
    if (!opponent?.memberId) continue;

    const entry = byOpponent.get(opponent.memberId) ?? {
      opponentMemberId: opponent.memberId,
      wins: 0,
      losses: 0,
    };
    if (game.winnerParticipantId === self.id) entry.wins++;
    else entry.losses++;
    byOpponent.set(opponent.memberId, entry);
  }

  return [...byOpponent.values()];
}
