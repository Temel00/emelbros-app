import { describe, expect, it, vi } from "vitest";

import {
  deletePin,
  getPins,
  getProfile,
  insertPin,
  updatePinPosition,
} from "@/platform/queries";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// A query-builder stand-in that stays chainable through any number of
// `.eq()`/`.is()`/`.order()`/`.single()` calls and resolves to `result` when
// awaited — covers every call shape in queries.ts (select+eq+single,
// select+order, insert, delete+eq+is/eq, update+eq) without one mock per
// chain shape.
function fakeSupabaseClient(result: { data?: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve),
  };
  chain.eq = vi.fn(() => chain);
  chain.is = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.single = vi.fn(() => chain);

  const select = vi.fn(() => chain);
  const insert = vi.fn(() => chain);
  const del = vi.fn(() => chain);
  const update = vi.fn(() => chain);
  const from = vi.fn(() => ({ select, insert, delete: del, update }));

  return {
    client: { from } as unknown as SupabaseClient<Database>,
    select,
    insert,
    delete: del,
    update,
    chain,
  };
}

describe("getProfile", () => {
  it("returns data on success", async () => {
    const profile = { id: "member-1", accent: "pink", created_at: "now" };
    const { client } = fakeSupabaseClient({ data: profile, error: null });

    await expect(getProfile(client, "member-1")).resolves.toEqual(profile);
  });

  it("throws on a forced error", async () => {
    const { client } = fakeSupabaseClient({
      data: null,
      error: new Error("forced failure"),
    });

    await expect(getProfile(client, "member-1")).rejects.toThrow(
      "forced failure",
    );
  });
});

describe("getPins", () => {
  it("returns rows ordered by position", async () => {
    const pins = [
      { id: "1", member_id: "m1", module: "darts", widget: null, position: 0 },
    ];
    const { client } = fakeSupabaseClient({ data: pins, error: null });

    await expect(getPins(client, "m1")).resolves.toEqual(pins);
  });

  it("throws on a forced error", async () => {
    const { client } = fakeSupabaseClient({
      data: null,
      error: new Error("forced failure"),
    });

    await expect(getPins(client, "m1")).rejects.toThrow("forced failure");
  });
});

describe("insertPin", () => {
  it("inserts a pin row", async () => {
    const { client, insert } = fakeSupabaseClient({ error: null });

    await insertPin(client, {
      memberId: "m1",
      module: "darts",
      widget: null,
      position: 0,
    });

    expect(insert).toHaveBeenCalledWith({
      member_id: "m1",
      module: "darts",
      widget: null,
      position: 0,
    });
  });

  it("throws on a forced error", async () => {
    const { client } = fakeSupabaseClient({
      error: new Error("forced failure"),
    });

    await expect(
      insertPin(client, {
        memberId: "m1",
        module: "darts",
        widget: null,
        position: 0,
      }),
    ).rejects.toThrow("forced failure");
  });
});

describe("deletePin", () => {
  it("matches a null widget with .is()", async () => {
    const { client, chain } = fakeSupabaseClient({ error: null });

    await deletePin(client, "m1", "darts", null);

    expect(chain.is).toHaveBeenCalledWith("widget", null);
  });

  it("matches a widget id with .eq()", async () => {
    const { client, chain } = fakeSupabaseClient({ error: null });

    await deletePin(client, "m1", "darts", "career-record");

    expect(chain.eq).toHaveBeenCalledWith("widget", "career-record");
  });

  it("throws on a forced error", async () => {
    const { client } = fakeSupabaseClient({
      error: new Error("forced failure"),
    });

    await expect(deletePin(client, "m1", "darts", null)).rejects.toThrow(
      "forced failure",
    );
  });
});

describe("updatePinPosition", () => {
  it("updates the position for a pin id", async () => {
    const { client, update } = fakeSupabaseClient({ error: null });

    await updatePinPosition(client, "pin-1", 3);

    expect(update).toHaveBeenCalledWith({ position: 3 });
  });

  it("throws on a forced error", async () => {
    const { client } = fakeSupabaseClient({
      error: new Error("forced failure"),
    });

    await expect(updatePinPosition(client, "pin-1", 3)).rejects.toThrow(
      "forced failure",
    );
  });
});
