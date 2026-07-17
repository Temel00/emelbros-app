import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/types/database";

/**
 * RLS integration tests for the darts module (darts.md §7, acceptance
 * criteria of #29, testing conventions #13). These hit a live local
 * Supabase stack (`supabase start`) rather than mocks, so — per the
 * `**\/*.rls.test.{ts,tsx}` exclude in vitest.config.ts — they are kept out
 * of the default `vitest run` and are run explicitly once a local stack is
 * available:
 *
 *   supabase start
 *   SUPABASE_SERVICE_ROLE_KEY=<local service_role key> \
 *   SUPABASE_ANON_KEY=<local anon key> \
 *   vitest run modules/darts/darts.rls.test.ts
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const PASSWORD = "darts-rls-test-password-1!";

const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY);

type Member = { id: string; client: SupabaseClient<Database> };

async function createMember(label: string): Promise<Member> {
  const email = `darts-rls-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;

  const client = createClient<Database>(SUPABASE_URL, ANON_KEY);
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (signInError) throw signInError;

  return { id: data.user.id, client };
}

/** Inserts a completed game (owner vs. opponent) via the service-role client, bypassing RLS. */
async function createCompletedGame(owner: Member, opponent: Member) {
  const { data: game, error: gameError } = await admin
    .from("darts_game")
    .insert({ owner_member_id: owner.id, variant: 501, status: "in_progress" })
    .select("id")
    .single();
  if (gameError) throw gameError;

  const { data: participants, error: participantsError } = await admin
    .from("darts_participant")
    .insert([
      { game_id: game.id, member_id: owner.id, slot: 1 },
      { game_id: game.id, member_id: opponent.id, slot: 2 },
    ])
    .select("id");
  if (participantsError) throw participantsError;

  const { error: completeError } = await admin
    .from("darts_game")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      starting_participant_id: participants[0].id,
      winner_participant_id: participants[0].id,
    })
    .eq("id", game.id);
  if (completeError) throw completeError;

  return game.id as string;
}

describe("darts RLS", () => {
  let owner: Member;
  let opponent: Member;
  let bystander: Member;
  let leftoverGameIds: string[] = [];

  beforeAll(async () => {
    owner = await createMember("owner");
    opponent = await createMember("opponent");
    bystander = await createMember("bystander");
  });

  afterEach(async () => {
    for (const id of leftoverGameIds) {
      await admin.from("darts_game").delete().eq("id", id);
    }
    leftoverGameIds = [];
  });

  afterAll(async () => {
    for (const member of [owner, opponent, bystander]) {
      await admin.auth.admin.deleteUser(member.id);
    }
  });

  it("lets any signed-in member read the game (fixed Family scope)", async () => {
    const gameId = await createCompletedGame(owner, opponent);
    leftoverGameIds.push(gameId);

    const { data, error } = await bystander.client
      .from("darts_game")
      .select("id")
      .eq("id", gameId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.id).toBe(gameId);
  });

  it("lets any signed-in member read the game's participants", async () => {
    const gameId = await createCompletedGame(owner, opponent);
    leftoverGameIds.push(gameId);

    const { data, error } = await bystander.client
      .from("darts_participant")
      .select("id")
      .eq("game_id", gameId);

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
  });

  it("blocks a non-owner, non-participant member from deleting a completed game", async () => {
    const gameId = await createCompletedGame(owner, opponent);
    leftoverGameIds.push(gameId);

    const { error, count } = await bystander.client
      .from("darts_game")
      .delete({ count: "exact" })
      .eq("id", gameId);

    // RLS silently filters rather than erroring: no matching row to delete.
    expect(error).toBeNull();
    expect(count).toBe(0);
  });

  it("lets the owner (tracker) delete a completed game", async () => {
    const gameId = await createCompletedGame(owner, opponent);

    const { error, count } = await owner.client
      .from("darts_game")
      .delete({ count: "exact" })
      .eq("id", gameId);

    expect(error).toBeNull();
    expect(count).toBe(1);
  });

  it("lets a participant who isn't the owner delete a completed game", async () => {
    const gameId = await createCompletedGame(owner, opponent);

    const { error, count } = await opponent.client
      .from("darts_game")
      .delete({ count: "exact" })
      .eq("id", gameId);

    expect(error).toBeNull();
    expect(count).toBe(1);
  });
});
