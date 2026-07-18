import { describe, expect, it, vi } from "vitest";

import {
  completeGame,
  createGame,
  createParticipants,
  deleteGame,
  deleteTurn,
  getCompletedGameDetail,
  getCompletedGames,
  getGame,
  getParticipants,
  getProfiles,
  getTurnsWithDarts,
  recordDarts,
  recordTurn,
  setStartingParticipant,
} from "@/modules/darts/queries";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * A query-builder stand-in that stays chainable through any number of
 * `.eq()`/`.select()`/`.single()` calls and resolves to `result` when
 * awaited (mirrors platform/queries.test.ts's fake client).
 */
function fakeSupabaseClient(result: { data?: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve),
  };
  chain.eq = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);

  const insert = vi.fn(() => chain);
  const update = vi.fn(() => chain);
  const del = vi.fn(() => chain);
  const select = vi.fn(() => chain);
  const from = vi.fn(() => ({ insert, update, delete: del, select }));

  return {
    client: { from } as unknown as SupabaseClient<Database>,
    from,
    insert,
    update,
    delete: del,
    select,
  };
}

describe("createGame", () => {
  it("inserts a game row for the owner and variant", async () => {
    const game = { id: "game-1", owner_member_id: "m1", variant: 501 };
    const { client, from, insert } = fakeSupabaseClient({
      data: game,
      error: null,
    });

    await expect(
      createGame(client, { ownerMemberId: "m1", variant: 501 }),
    ).resolves.toEqual(game);
    expect(from).toHaveBeenCalledWith("darts_game");
    expect(insert).toHaveBeenCalledWith({
      owner_member_id: "m1",
      variant: 501,
    });
  });

  it("throws on a forced error", async () => {
    const { client } = fakeSupabaseClient({
      data: null,
      error: new Error("forced failure"),
    });

    await expect(
      createGame(client, { ownerMemberId: "m1", variant: 501 }),
    ).rejects.toThrow("forced failure");
  });
});

describe("createParticipants", () => {
  it("inserts both players as slot 1 and slot 2", async () => {
    const { client, insert } = fakeSupabaseClient({ data: [], error: null });

    await createParticipants(client, "game-1", [
      { memberId: "m1" },
      { guestName: "Cousin Pat" },
    ]);

    expect(insert).toHaveBeenCalledWith([
      { game_id: "game-1", slot: 1, member_id: "m1", guest_name: null },
      {
        game_id: "game-1",
        slot: 2,
        member_id: null,
        guest_name: "Cousin Pat",
      },
    ]);
  });

  it("throws on a forced error", async () => {
    const { client } = fakeSupabaseClient({
      data: null,
      error: new Error("forced failure"),
    });

    await expect(
      createParticipants(client, "game-1", [
        { memberId: "m1" },
        { memberId: "m2" },
      ]),
    ).rejects.toThrow("forced failure");
  });
});

describe("getGame", () => {
  it("reads a game by id", async () => {
    const game = { id: "game-1", variant: 501 };
    const { client, from, select } = fakeSupabaseClient({
      data: game,
      error: null,
    });

    await expect(getGame(client, "game-1")).resolves.toEqual(game);
    expect(from).toHaveBeenCalledWith("darts_game");
    expect(select).toHaveBeenCalledWith("*");
  });

  it("throws on a forced error", async () => {
    const { client } = fakeSupabaseClient({
      data: null,
      error: new Error("forced failure"),
    });

    await expect(getGame(client, "game-1")).rejects.toThrow("forced failure");
  });

  it("returns null when the game doesn't exist or isn't visible", async () => {
    const { client } = fakeMultiTableClient({
      darts_game: { data: null, error: null },
    });

    await expect(getGame(client, "missing")).resolves.toBeNull();
  });
});

describe("getProfiles", () => {
  it("reads every profile", async () => {
    const profiles = [{ id: "m1" }, { id: "m2" }];
    const { client, from } = fakeSupabaseClient({
      data: profiles,
      error: null,
    });

    await expect(getProfiles(client)).resolves.toEqual(profiles);
    expect(from).toHaveBeenCalledWith("profiles");
  });

  it("throws on a forced error", async () => {
    const { client } = fakeSupabaseClient({
      data: null,
      error: new Error("forced failure"),
    });

    await expect(getProfiles(client)).rejects.toThrow("forced failure");
  });
});

describe("getParticipants", () => {
  it("reads a game's participants in slot order", async () => {
    const participants = [
      { id: "p1", slot: 1 },
      { id: "p2", slot: 2 },
    ];
    const { client, from } = fakeSupabaseClient({
      data: participants,
      error: null,
    });

    await expect(getParticipants(client, "game-1")).resolves.toEqual(
      participants,
    );
    expect(from).toHaveBeenCalledWith("darts_participant");
  });

  it("throws on a forced error", async () => {
    const { client } = fakeSupabaseClient({
      data: null,
      error: new Error("forced failure"),
    });

    await expect(getParticipants(client, "game-1")).rejects.toThrow(
      "forced failure",
    );
  });
});

describe("getTurnsWithDarts", () => {
  it("reads turns with their darts sorted by dart_number", async () => {
    const turns = [
      {
        id: "turn-1",
        turn_number: 1,
        darts: [
          { dart_number: 2, segment: 1, multiple: 1 },
          { dart_number: 1, segment: 20, multiple: 3 },
        ],
      },
    ];
    const { client, from } = fakeSupabaseClient({ data: turns, error: null });

    await expect(getTurnsWithDarts(client, "game-1")).resolves.toEqual([
      {
        id: "turn-1",
        turn_number: 1,
        darts: [
          { dart_number: 1, segment: 20, multiple: 3 },
          { dart_number: 2, segment: 1, multiple: 1 },
        ],
      },
    ]);
    expect(from).toHaveBeenCalledWith("darts_turn");
  });

  it("throws on a forced error", async () => {
    const { client } = fakeSupabaseClient({
      data: null,
      error: new Error("forced failure"),
    });

    await expect(getTurnsWithDarts(client, "game-1")).rejects.toThrow(
      "forced failure",
    );
  });
});

describe("deleteTurn", () => {
  it("deletes the turn row by id", async () => {
    const { client, delete: del, from } = fakeSupabaseClient({ error: null });

    await deleteTurn(client, "turn-1");

    expect(from).toHaveBeenCalledWith("darts_turn");
    expect(del).toHaveBeenCalled();
  });

  it("throws on a forced error", async () => {
    const { client } = fakeSupabaseClient({
      error: new Error("forced failure"),
    });

    await expect(deleteTurn(client, "turn-1")).rejects.toThrow(
      "forced failure",
    );
  });
});

describe("setStartingParticipant", () => {
  it("updates the game's starting participant", async () => {
    const game = { id: "game-1", starting_participant_id: "p1" };
    const { client, update } = fakeSupabaseClient({
      data: game,
      error: null,
    });

    await expect(
      setStartingParticipant(client, "game-1", "p1"),
    ).resolves.toEqual(game);
    expect(update).toHaveBeenCalledWith({ starting_participant_id: "p1" });
  });

  it("throws on a forced error", async () => {
    const { client } = fakeSupabaseClient({
      data: null,
      error: new Error("forced failure"),
    });

    await expect(
      setStartingParticipant(client, "game-1", "p1"),
    ).rejects.toThrow("forced failure");
  });
});

describe("recordTurn", () => {
  it("inserts a turn row", async () => {
    const turnRow = { id: "turn-1" };
    const { client, insert } = fakeSupabaseClient({
      data: turnRow,
      error: null,
    });

    await expect(
      recordTurn(client, {
        gameId: "game-1",
        participantId: "p1",
        turnNumber: 1,
        busted: false,
      }),
    ).resolves.toEqual(turnRow);
    expect(insert).toHaveBeenCalledWith({
      game_id: "game-1",
      participant_id: "p1",
      turn_number: 1,
      busted: false,
    });
  });

  it("throws on a forced error", async () => {
    const { client } = fakeSupabaseClient({
      data: null,
      error: new Error("forced failure"),
    });

    await expect(
      recordTurn(client, {
        gameId: "game-1",
        participantId: "p1",
        turnNumber: 1,
        busted: false,
      }),
    ).rejects.toThrow("forced failure");
  });
});

describe("recordDarts", () => {
  it("inserts darts in throw order, numbered from 1", async () => {
    const { client, insert } = fakeSupabaseClient({ data: [], error: null });

    await recordDarts(client, "turn-1", [
      { segment: 20, multiple: 3 },
      { segment: 20, multiple: 2 },
    ]);

    expect(insert).toHaveBeenCalledWith([
      { turn_id: "turn-1", dart_number: 1, segment: 20, multiple: 3 },
      { turn_id: "turn-1", dart_number: 2, segment: 20, multiple: 2 },
    ]);
  });

  it("throws on a forced error", async () => {
    const { client } = fakeSupabaseClient({
      data: null,
      error: new Error("forced failure"),
    });

    await expect(
      recordDarts(client, "turn-1", [{ segment: 0, multiple: 1 }]),
    ).rejects.toThrow("forced failure");
  });
});

describe("completeGame", () => {
  it("marks the game completed with a winner and completed_at", async () => {
    const game = { id: "game-1", status: "completed" };
    const { client, update } = fakeSupabaseClient({
      data: game,
      error: null,
    });

    await expect(completeGame(client, "game-1", "p1")).resolves.toEqual(game);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "completed",
        winner_participant_id: "p1",
        completed_at: expect.any(String),
      }),
    );
  });

  it("throws on a forced error", async () => {
    const { client } = fakeSupabaseClient({
      data: null,
      error: new Error("forced failure"),
    });

    await expect(completeGame(client, "game-1", "p1")).rejects.toThrow(
      "forced failure",
    );
  });
});

describe("deleteGame", () => {
  it("deletes the game row by id", async () => {
    const { client, delete: del, from } = fakeSupabaseClient({ error: null });

    await deleteGame(client, "game-1");

    expect(from).toHaveBeenCalledWith("darts_game");
    expect(del).toHaveBeenCalled();
  });

  it("throws on a forced error", async () => {
    const { client } = fakeSupabaseClient({
      error: new Error("forced failure"),
    });

    await expect(deleteGame(client, "game-1")).rejects.toThrow(
      "forced failure",
    );
  });
});

/**
 * A table-aware fake: each table name maps to the `{ data, error }` it
 * resolves to, chainable through any number of `.eq()`/`.in()`/`.order()`/
 * `.maybeSingle()` calls. Needed for the multi-query functions below, which
 * hit several tables in one call.
 */
function fakeMultiTableClient(
  resultsByTable: Record<string, { data?: unknown; error: unknown }>,
) {
  const from = vi.fn((table: string) => {
    const result = resultsByTable[table] ?? { data: [], error: null };
    const chain: Record<string, unknown> = {
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve(result).then(resolve),
    };
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.in = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.maybeSingle = vi.fn(() => Promise.resolve(result));
    return chain;
  });

  return { client: { from } as unknown as SupabaseClient<Database>, from };
}

describe("getCompletedGames", () => {
  it("assembles completed games from the four flat queries", async () => {
    const game = {
      id: "game1",
      variant: 501,
      owner_member_id: "alice",
      winner_participant_id: "p1",
      completed_at: "2026-01-01T00:00:00.000Z",
      status: "completed",
    };
    const participant = {
      id: "p1",
      game_id: "game1",
      member_id: "alice",
      guest_name: null,
      slot: 1,
    };
    const turn = {
      id: "t1",
      game_id: "game1",
      participant_id: "p1",
      turn_number: 1,
      busted: false,
    };
    const dart = { turn_id: "t1", dart_number: 1, segment: 20, multiple: 2 };

    const { client } = fakeMultiTableClient({
      darts_game: { data: [game], error: null },
      darts_participant: { data: [participant], error: null },
      darts_turn: { data: [turn], error: null },
      darts_dart: { data: [dart], error: null },
    });

    const games = await getCompletedGames(client);

    expect(games).toHaveLength(1);
    expect(games[0].id).toBe("game1");
    expect(games[0].participants).toEqual([
      { id: "p1", memberId: "alice", guestName: null, slot: 1 },
    ]);
    expect(games[0].turns).toEqual([
      {
        participantId: "p1",
        turnNumber: 1,
        busted: false,
        darts: [{ segment: 20, multiple: 2 }],
      },
    ]);
  });

  it("returns an empty list when there are no completed games", async () => {
    const { client } = fakeMultiTableClient({
      darts_game: { data: [], error: null },
    });

    await expect(getCompletedGames(client)).resolves.toEqual([]);
  });
});

describe("getCompletedGameDetail", () => {
  it("returns null for a game that isn't completed", async () => {
    const { client } = fakeMultiTableClient({
      darts_game: { data: { id: "game1", status: "in_progress" }, error: null },
    });

    await expect(getCompletedGameDetail(client, "game1")).resolves.toBeNull();
  });

  it("returns null for a game that doesn't exist", async () => {
    const { client } = fakeMultiTableClient({
      darts_game: { data: null, error: null },
    });

    await expect(getCompletedGameDetail(client, "missing")).resolves.toBeNull();
  });

  it("assembles the single completed game's detail", async () => {
    const game = {
      id: "game1",
      variant: 501,
      owner_member_id: "alice",
      winner_participant_id: "p1",
      completed_at: "2026-01-01T00:00:00.000Z",
      status: "completed",
    };
    const { client } = fakeMultiTableClient({
      darts_game: { data: game, error: null },
      darts_participant: { data: [], error: null },
      darts_turn: { data: [], error: null },
      darts_dart: { data: [], error: null },
    });

    const detail = await getCompletedGameDetail(client, "game1");
    expect(detail?.id).toBe("game1");
  });
});
