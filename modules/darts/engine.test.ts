import { describe, expect, it } from "vitest";

import {
  computeGameState,
  dartValue,
  isDouble,
  undoLastDart,
  type ThrownDart,
} from "@/modules/darts/engine";

const single = (segment: number): ThrownDart => ({ segment, multiple: 1 });
const double = (segment: number): ThrownDart => ({ segment, multiple: 2 });
const treble = (segment: number): ThrownDart => ({ segment, multiple: 3 });
const bull = (): ThrownDart => ({ segment: 50, multiple: 1 });
const outerBull = (): ThrownDart => ({ segment: 25, multiple: 1 });
const miss = (): ThrownDart => ({ segment: 0, multiple: 1 });

describe("dartValue", () => {
  it("multiplies segment by multiple for 1-20", () => {
    expect(dartValue(treble(20))).toBe(60);
    expect(dartValue(double(16))).toBe(32);
    expect(dartValue(single(5))).toBe(5);
  });

  it("counts 25 and 50 at face value regardless of multiple", () => {
    expect(dartValue(outerBull())).toBe(25);
    expect(dartValue(bull())).toBe(50);
  });

  it("a miss scores 0", () => {
    expect(dartValue(miss())).toBe(0);
  });
});

describe("isDouble", () => {
  it("the bull (50) counts as a double", () => {
    expect(isDouble(bull())).toBe(true);
  });

  it("25 does not count as a double", () => {
    expect(isDouble(outerBull())).toBe(false);
  });

  it("a double segment counts as a double, a single/treble doesn't", () => {
    expect(isDouble(double(20))).toBe(true);
    expect(isDouble(single(20))).toBe(false);
    expect(isDouble(treble(20))).toBe(false);
  });
});

describe("computeGameState", () => {
  const config = { startingScore: 501, startingPlayer: 0 as const };

  it("starts both players at the starting score", () => {
    const state = computeGameState([], config);
    expect(state.scores).toEqual([501, 501]);
    expect(state.status).toBe("in_progress");
    expect(state.currentPlayer).toBe(0);
  });

  it("reduces the current player's score as darts land within a turn", () => {
    const state = computeGameState([treble(20), treble(20)], config);
    expect(state.scores[0]).toBe(501 - 60 - 60);
    expect(state.currentTurnDarts).toHaveLength(2);
    expect(state.turns).toHaveLength(0);
  });

  it("ends a turn after three darts and passes to the other player", () => {
    const state = computeGameState([single(1), single(1), single(1)], config);
    expect(state.turns).toHaveLength(1);
    expect(state.turns[0]).toMatchObject({
      player: 0,
      scoreBefore: 501,
      scoreAfter: 498,
      busted: false,
      checkout: false,
    });
    expect(state.currentPlayer).toBe(1);
    expect(state.scores).toEqual([498, 501]);
  });

  it("alternates players turn by turn", () => {
    const state = computeGameState(
      [
        single(1),
        single(1),
        single(1), // player 0 turn: -3
        single(2),
        single(2),
        single(2), // player 1 turn: -6
      ],
      config,
    );
    expect(state.turns.map((t) => t.player)).toEqual([0, 1]);
    expect(state.scores).toEqual([498, 495]);
    expect(state.currentPlayer).toBe(0);
  });

  it("busts a turn that would take the score below 0", () => {
    // Start at 41: a treble-20 (60) would go to -19 on the first dart.
    const state = computeGameState([treble(20)], {
      startingScore: 41,
      startingPlayer: 0,
    });
    expect(state.turns).toHaveLength(1);
    expect(state.turns[0].busted).toBe(true);
    expect(state.turns[0].darts).toHaveLength(1);
    expect(state.turns[0].scoreAfter).toBe(41);
  });

  it("busts a turn that would take the score to exactly 1", () => {
    // Start at 41: single 20 (20) -> 21, single 20 (20) -> 1: busts on the second dart.
    const state = computeGameState([single(20), single(20)], {
      startingScore: 41,
      startingPlayer: 0,
    });
    expect(state.turns).toHaveLength(1);
    expect(state.turns[0].busted).toBe(true);
    expect(state.turns[0].scoreAfter).toBe(41);
    expect(state.scores[0]).toBe(41);
  });

  it("busts a turn that reaches exactly 0 on a non-double", () => {
    // Start at 20: single 20 reaches 0 but isn't a double -> bust.
    const state = computeGameState([single(20)], {
      startingScore: 20,
      startingPlayer: 0,
    });
    expect(state.turns).toHaveLength(1);
    expect(state.turns[0].busted).toBe(true);
    expect(state.turns[0].checkout).toBe(false);
    expect(state.scores[0]).toBe(20);
    expect(state.status).toBe("in_progress");
  });

  it("stops consuming darts once a turn busts, even if more darts follow", () => {
    const state = computeGameState([single(20), single(1), single(1)], {
      startingScore: 20,
      startingPlayer: 0,
    });
    expect(state.turns).toHaveLength(1);
    expect(state.turns[0].darts).toHaveLength(1);
  });

  it("checks out on reaching exactly 0 with a double", () => {
    const state = computeGameState([double(20)], {
      startingScore: 40,
      startingPlayer: 0,
    });
    expect(state.turns).toHaveLength(1);
    expect(state.turns[0]).toMatchObject({ busted: false, checkout: true });
    expect(state.status).toBe("completed");
    expect(state.winner).toBe(0);
    expect(state.scores[0]).toBe(0);
  });

  it("the bull counts as a double for a checkout", () => {
    const state = computeGameState([bull()], {
      startingScore: 50,
      startingPlayer: 1,
    });
    expect(state.status).toBe("completed");
    expect(state.winner).toBe(1);
  });

  it("busts when reaching 0 via 25 (not a double)", () => {
    const state = computeGameState([outerBull()], {
      startingScore: 25,
      startingPlayer: 0,
    });
    expect(state.turns[0].busted).toBe(true);
    expect(state.status).toBe("in_progress");
  });

  it("ignores darts entered after a checkout — a completed game is immutable", () => {
    const state = computeGameState([double(20), single(20), single(20)], {
      startingScore: 40,
      startingPlayer: 0,
    });
    expect(state.status).toBe("completed");
    expect(state.turns).toHaveLength(1);
  });

  it("a miss (segment 0) is a real dart that counts toward the turn", () => {
    const state = computeGameState([miss(), miss(), miss()], config);
    expect(state.turns).toHaveLength(1);
    expect(state.turns[0].darts).toHaveLength(3);
    expect(state.scores[0]).toBe(501);
  });
});

describe("undoLastDart", () => {
  const config = { startingScore: 501, startingPlayer: 0 as const };

  it("removes only the single most recent dart", () => {
    const darts = [single(1), single(2), single(3)];
    expect(undoLastDart(darts)).toEqual([single(1), single(2)]);
  });

  it("stepping back re-derives the prior in-progress turn", () => {
    const darts = [single(1), single(1), single(1), single(2)];
    const before = computeGameState(darts, config);
    expect(before.currentPlayer).toBe(1);
    expect(before.currentTurnDarts).toHaveLength(1);

    const after = computeGameState(undoLastDart(darts), config);
    expect(after.currentPlayer).toBe(1);
    expect(after.currentTurnDarts).toHaveLength(0);
    expect(after.turns).toHaveLength(1);
  });

  it("undo can step back across a turn boundary onto the previous player", () => {
    // Player 0 throws a full turn (3 darts); player 1 hasn't thrown yet.
    const darts = [single(1), single(1), single(1)];
    const before = computeGameState(darts, config);
    expect(before.currentPlayer).toBe(1);
    expect(before.turns).toHaveLength(1);

    const after = computeGameState(undoLastDart(darts), config);
    expect(after.currentPlayer).toBe(0);
    expect(after.turns).toHaveLength(0);
    expect(after.currentTurnDarts).toHaveLength(2);
  });

  it("undo can unwind all the way past a checkout, reopening the game", () => {
    const darts = [double(20)];
    const checkoutConfig = { startingScore: 40, startingPlayer: 0 as const };
    const completed = computeGameState(darts, checkoutConfig);
    expect(completed.status).toBe("completed");

    const reopened = computeGameState(undoLastDart(darts), checkoutConfig);
    expect(reopened.status).toBe("in_progress");
    expect(reopened.turns).toHaveLength(0);
  });

  it("undoing an empty list is a no-op", () => {
    expect(undoLastDart([])).toEqual([]);
  });
});
