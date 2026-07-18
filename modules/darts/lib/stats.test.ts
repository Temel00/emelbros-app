import { describe, expect, it } from "vitest";

import {
  assembleCompletedGames,
  computeCareerRecord,
  computeHeadToHead,
  summarizeGame,
  summarizeMyDarts,
  type CompletedGame,
} from "@/modules/darts/lib/stats";

/**
 * Hand-computed fixture (darts.md acceptance for #32): three completed
 * games — alice beats bob, alice beats a guest (Pat), carol beats bob — used
 * to check career records, averages, checkout/turn/leg bests, 180 counts,
 * and head-to-head derivation against numbers worked out by hand.
 */
function seededGames(): CompletedGame[] {
  return [
    {
      id: "game1",
      variant: 501,
      ownerMemberId: "alice",
      winnerParticipantId: "g1p1",
      completedAt: "2026-01-01T00:00:00.000Z",
      participants: [
        { id: "g1p1", memberId: "alice", guestName: null, slot: 1 },
        { id: "g1p2", memberId: "bob", guestName: null, slot: 2 },
      ],
      turns: [
        {
          participantId: "g1p1",
          turnNumber: 1,
          busted: false,
          darts: [
            { segment: 20, multiple: 3 },
            { segment: 20, multiple: 3 },
            { segment: 20, multiple: 3 },
          ], // 180
        },
        {
          participantId: "g1p2",
          turnNumber: 2,
          busted: false,
          darts: [
            { segment: 1, multiple: 1 },
            { segment: 1, multiple: 1 },
            { segment: 1, multiple: 1 },
          ], // 3
        },
        {
          participantId: "g1p1",
          turnNumber: 3,
          busted: false,
          darts: [{ segment: 20, multiple: 2 }], // checkout, 40
        },
      ],
    },
    {
      id: "game2",
      variant: 501,
      ownerMemberId: "alice",
      winnerParticipantId: "g2p1",
      completedAt: "2026-01-02T00:00:00.000Z",
      participants: [
        { id: "g2p1", memberId: "alice", guestName: null, slot: 1 },
        { id: "g2p2", memberId: null, guestName: "Pat", slot: 2 },
      ],
      turns: [
        {
          participantId: "g2p1",
          turnNumber: 1,
          busted: false,
          darts: [
            { segment: 20, multiple: 1 },
            { segment: 20, multiple: 1 },
            { segment: 20, multiple: 1 },
          ], // 60
        },
        {
          participantId: "g2p1",
          turnNumber: 2,
          busted: false,
          darts: [{ segment: 20, multiple: 2 }], // checkout, 40
        },
      ],
    },
    {
      id: "game3",
      variant: 301,
      ownerMemberId: "carol",
      winnerParticipantId: "g3p2",
      completedAt: "2026-01-03T00:00:00.000Z",
      participants: [
        { id: "g3p1", memberId: "bob", guestName: null, slot: 1 },
        { id: "g3p2", memberId: "carol", guestName: null, slot: 2 },
      ],
      turns: [
        {
          participantId: "g3p1",
          turnNumber: 1,
          busted: false,
          darts: [
            { segment: 5, multiple: 1 },
            { segment: 5, multiple: 1 },
            { segment: 5, multiple: 1 },
          ], // 15
        },
        {
          participantId: "g3p2",
          turnNumber: 2,
          busted: false,
          darts: [
            { segment: 20, multiple: 1 },
            { segment: 20, multiple: 1 },
            { segment: 20, multiple: 1 },
          ], // 60
        },
        {
          participantId: "g3p2",
          turnNumber: 3,
          busted: false,
          darts: [{ segment: 50, multiple: 1 }], // checkout, bull = 50
        },
      ],
    },
  ];
}

describe("computeCareerRecord", () => {
  it("counts a guest game toward the member's record and averages", () => {
    const record = computeCareerRecord(seededGames(), "alice");

    expect(record.played).toBe(2);
    expect(record.wins).toBe(2);
    expect(record.losses).toBe(0);
    expect(record.winPct).toBe(1);
    // (220 + 100) points over (4 + 4) darts, *3
    expect(record.threeDartAverage).toBe(120);
    expect(record.bestGameAverage).toBe(165); // 220 pts / 4 darts * 3
    expect(record.highestCheckout).toBe(40);
    expect(record.highestTurn).toBe(180);
    expect(record.bestLeg).toBe(4);
    expect(record.count180).toBe(1);
  });

  it("computes a losing member's record with no checkout or best leg", () => {
    const record = computeCareerRecord(seededGames(), "bob");

    expect(record.played).toBe(2);
    expect(record.wins).toBe(0);
    expect(record.losses).toBe(2);
    expect(record.winPct).toBe(0);
    expect(record.threeDartAverage).toBe(9); // 18 pts / 6 darts * 3
    expect(record.bestGameAverage).toBe(15); // 15 pts / 3 darts * 3
    expect(record.highestCheckout).toBe(0);
    expect(record.highestTurn).toBe(15);
    expect(record.bestLeg).toBeNull();
    expect(record.count180).toBe(0);
  });

  it("computes a single-game winner's record", () => {
    const record = computeCareerRecord(seededGames(), "carol");

    expect(record.played).toBe(1);
    expect(record.wins).toBe(1);
    expect(record.winPct).toBe(1);
    expect(record.threeDartAverage).toBe(82.5);
    expect(record.highestCheckout).toBe(50);
    expect(record.highestTurn).toBe(60);
    expect(record.bestLeg).toBe(4);
  });

  it("returns a zeroed record for a member with no completed games", () => {
    const record = computeCareerRecord(seededGames(), "nobody");

    expect(record).toEqual({
      memberId: "nobody",
      played: 0,
      wins: 0,
      losses: 0,
      winPct: 0,
      threeDartAverage: 0,
      bestGameAverage: 0,
      highestCheckout: 0,
      highestTurn: 0,
      bestLeg: null,
      count180: 0,
    });
  });
});

describe("computeHeadToHead", () => {
  it("excludes guest games but includes member-vs-member results", () => {
    const h2h = computeHeadToHead(seededGames(), "alice");

    expect(h2h).toEqual([{ opponentMemberId: "bob", wins: 1, losses: 0 }]);
  });

  it("aggregates results against multiple opponents", () => {
    const h2h = computeHeadToHead(seededGames(), "bob");

    expect(h2h).toEqual([
      { opponentMemberId: "alice", wins: 0, losses: 1 },
      { opponentMemberId: "carol", wins: 0, losses: 1 },
    ]);
  });

  it("returns an empty list for a member with no member-vs-member games", () => {
    expect(computeHeadToHead(seededGames(), "nobody")).toEqual([]);
  });
});

describe("summarizeGame", () => {
  it("summarizes each participant's turn-by-turn detail, points, average, and checkout", () => {
    const [game1] = seededGames();
    const summaries = summarizeGame(game1);

    const alice = summaries.find((s) => s.participantId === "g1p1");
    expect(alice).toEqual({
      participantId: "g1p1",
      darts: 4,
      points: 220,
      average: 165,
      checkout: 40,
      turns: [
        {
          turnNumber: 1,
          busted: false,
          points: 180,
          darts: [
            { segment: 20, multiple: 3 },
            { segment: 20, multiple: 3 },
            { segment: 20, multiple: 3 },
          ],
        },
        {
          turnNumber: 3,
          busted: false,
          points: 40,
          darts: [{ segment: 20, multiple: 2 }],
        },
      ],
    });

    const bob = summaries.find((s) => s.participantId === "g1p2");
    expect(bob?.checkout).toBeNull();
    expect(bob?.points).toBe(3);
    expect(bob?.darts).toBe(3);
    expect(bob?.average).toBe(3);
  });
});

describe("summarizeMyDarts", () => {
  it("summarizes the member's recent W/L and most recent game as a player", () => {
    const summary = summarizeMyDarts(seededGames(), "alice");

    // alice played game1 (win) and game2 (win); most recent is game2 vs Pat.
    expect(summary.recent).toEqual({ wins: 2, losses: 0, played: 2 });
    expect(summary.mostRecent).toEqual({
      gameId: "game2",
      opponent: { id: "g2p2", memberId: null, guestName: "Pat", slot: 2 },
      won: true,
    });
  });

  it("records a loss and the winning opponent for a member who lost their last game", () => {
    const summary = summarizeMyDarts(seededGames(), "bob");

    // bob lost game1 and game3; most recent is game3 vs carol.
    expect(summary.recent).toEqual({ wins: 0, losses: 2, played: 2 });
    expect(summary.mostRecent).toEqual({
      gameId: "game3",
      opponent: { id: "g3p2", memberId: "carol", guestName: null, slot: 2 },
      won: false,
    });
  });

  it("honours the limit when counting the recent record", () => {
    const summary = summarizeMyDarts(seededGames(), "alice", 1);

    // Only the most recent game (game2, a win) counts toward the record.
    expect(summary.recent).toEqual({ wins: 1, losses: 0, played: 1 });
    expect(summary.mostRecent?.gameId).toBe("game2");
  });

  it("ignores games the member only tracked but didn't play in", () => {
    // carol owns game3 but bob/carol are the players; a non-participant owner
    // gets no record from it.
    const trackerOnly = summarizeMyDarts(seededGames(), "dana");
    expect(trackerOnly.recent).toEqual({ wins: 0, losses: 0, played: 0 });
    expect(trackerOnly.mostRecent).toBeNull();
  });
});

describe("assembleCompletedGames", () => {
  it("joins flat game/participant/turn/dart rows into nested completed games", () => {
    const games = [
      {
        id: "game1",
        variant: 501,
        owner_member_id: "alice",
        winner_participant_id: "p1",
        completed_at: "2026-01-01T00:00:00.000Z",
      },
    ];
    const participants = [
      {
        id: "p1",
        game_id: "game1",
        member_id: "alice",
        guest_name: null,
        slot: 1,
      },
      {
        id: "p2",
        game_id: "game1",
        member_id: "bob",
        guest_name: null,
        slot: 2,
      },
    ];
    const turns = [
      {
        id: "t1",
        game_id: "game1",
        participant_id: "p1",
        turn_number: 1,
        busted: false,
      },
    ];
    const darts = [
      { turn_id: "t1", dart_number: 2, segment: 20, multiple: 2 },
      { turn_id: "t1", dart_number: 1, segment: 20, multiple: 1 },
    ];

    const [game] = assembleCompletedGames(games, participants, turns, darts);

    expect(game.id).toBe("game1");
    expect(game.participants).toHaveLength(2);
    expect(game.turns).toEqual([
      {
        participantId: "p1",
        turnNumber: 1,
        busted: false,
        darts: [
          { segment: 20, multiple: 1 },
          { segment: 20, multiple: 2 },
        ],
      },
    ]);
  });

  it("drops games with no winner (not actually completed)", () => {
    const games = [
      {
        id: "game1",
        variant: 501,
        owner_member_id: "alice",
        winner_participant_id: null,
        completed_at: null,
      },
    ];

    expect(assembleCompletedGames(games, [], [], [])).toEqual([]);
  });
});
