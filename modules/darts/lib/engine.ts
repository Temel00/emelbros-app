/**
 * The darts scoring engine (darts.md §2–§3): pure functions from a flat,
 * ordered list of thrown darts to derived game state. There is no mutable
 * session object — appending a dart or undoing one is just growing or
 * truncating the darts array and recomputing, which is what makes unlimited
 * undo (stepping back across turn/player boundaries) trivial and the engine
 * itself thin-glue-testable (issue #13) without a database.
 */

export type PlayerIndex = 0 | 1;

/** One thrown dart: a board segment and its multiple (darts.md §4). */
export type ThrownDart = {
  /** 1–20, 25 (single bull), or 50 (bull); 0 is a miss. */
  segment: number;
  /** 1 = single, 2 = double, 3 = treble. Always 1 for segment 0/25/50. */
  multiple: 1 | 2 | 3;
};

export type GameConfig = {
  /**
   * The score to count down from. Callers pass the game's stored `variant`
   * (301 or 501) here; the engine itself is agnostic to which variant it is
   * and just needs a starting total, which keeps it trivial to unit-test
   * against arbitrary small scores.
   */
  startingScore: number;
  startingPlayer: PlayerIndex;
};

export type TurnResult = {
  /** 1-based order of play within the game — what `queries.ts`'s `recordTurn` stores as `turn_number`. */
  turnNumber: number;
  player: PlayerIndex;
  darts: ThrownDart[];
  scoreBefore: number;
  /** Equal to `scoreBefore` when the turn busted. */
  scoreAfter: number;
  busted: boolean;
  /** True when this turn's last dart brought the player to a legal 0. */
  checkout: boolean;
};

export type GameState = {
  /** Remaining score per player, live-updated as darts land within a turn. */
  scores: [number, number];
  turns: TurnResult[];
  currentPlayer: PlayerIndex;
  /** Darts thrown so far in the turn that hasn't yet ended. */
  currentTurnDarts: ThrownDart[];
  status: "in_progress" | "completed";
  winner: PlayerIndex | null;
};

/** A dart's point value: `segment × multiple` for 1–20; 25/50 count as-is. */
export function dartValue(dart: ThrownDart): number {
  if (dart.segment === 25 || dart.segment === 50) return dart.segment;
  return dart.segment * dart.multiple;
}

/** The bull (50) counts as a double for double-out; 25 does not (darts.md §2). */
export function isDouble(dart: ThrownDart): boolean {
  if (dart.segment === 50) return true;
  if (dart.segment === 25) return false;
  return dart.multiple === 2;
}

/**
 * Removes the single most recent dart. Undo is unlimited and steps back
 * across turn/player boundaries for free, since `computeGameState` always
 * recomputes from the full darts list rather than from incremental state —
 * including, mechanically, back past a checkout dart. That's fine during
 * live play, where the darts list only exists in memory; but undo must never
 * be offered once a game has actually been persisted as completed
 * (`queries.ts`'s `completeGame`) — darts.md §3/§12 make a completed game
 * immutable, correctable only by deletion. Enforcing that boundary is the
 * live-scoring UI's job (stop calling this once the game is completed), not
 * this pure function's — it has no notion of what's been persisted.
 */
export function undoLastDart(darts: ThrownDart[]): ThrownDart[] {
  return darts.slice(0, -1);
}

/**
 * Replays an ordered list of thrown darts into the game state it produces:
 * running scores, completed turns (with bust/checkout flags), the
 * in-progress turn's darts so far, and whether/who has won.
 *
 * Straight-in / double-out (darts.md §2) is enforced here: a turn busts if a
 * dart would take the remaining score below 0, to exactly 1, or to 0 without
 * being a double; a checkout is the turn that reaches exactly 0 on a double.
 * Darts entered after a checkout are ignored — a completed game is immutable
 * (darts.md §3).
 */
export function computeGameState(
  darts: ThrownDart[],
  config: GameConfig,
): GameState {
  const scores: [number, number] = [config.startingScore, config.startingScore];
  let currentPlayer = config.startingPlayer;
  const turns: TurnResult[] = [];
  let currentTurnDarts: ThrownDart[] = [];
  let status: GameState["status"] = "in_progress";
  let winner: PlayerIndex | null = null;

  let i = 0;
  while (i < darts.length && status === "in_progress") {
    const scoreBefore = scores[currentPlayer];
    let running = scoreBefore;
    const turnDarts: ThrownDart[] = [];
    let busted = false;
    let checkout = false;

    while (turnDarts.length < 3 && i < darts.length) {
      const dart = darts[i];
      i++;
      turnDarts.push(dart);

      const remaining = running - dartValue(dart);
      if (remaining < 0 || remaining === 1) {
        busted = true;
        break;
      }
      if (remaining === 0) {
        if (isDouble(dart)) {
          running = 0;
          checkout = true;
        } else {
          busted = true;
        }
        break;
      }
      running = remaining;
    }

    const turnOver = busted || checkout || turnDarts.length === 3;
    if (!turnOver) {
      // Ran out of input mid-turn: this turn isn't resolved yet.
      currentTurnDarts = turnDarts;
      scores[currentPlayer] = running;
      break;
    }

    const scoreAfter = busted ? scoreBefore : running;
    scores[currentPlayer] = scoreAfter;
    turns.push({
      turnNumber: turns.length + 1,
      player: currentPlayer,
      darts: turnDarts,
      scoreBefore,
      scoreAfter,
      busted,
      checkout,
    });

    if (checkout) {
      status = "completed";
      winner = currentPlayer;
      break;
    }

    currentPlayer = currentPlayer === 0 ? 1 : 0;
  }

  return {
    scores,
    turns,
    currentPlayer,
    currentTurnDarts,
    status,
    winner,
  };
}
