import { describe, expect, it, vi } from "vitest";

import {
  completeGame,
  createGame,
  createParticipants,
  deleteGame,
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

  const insert = vi.fn(() => chain);
  const update = vi.fn(() => chain);
  const del = vi.fn(() => chain);
  const from = vi.fn(() => ({ insert, update, delete: del }));

  return {
    client: { from } as unknown as SupabaseClient<Database>,
    from,
    insert,
    update,
    delete: del,
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
