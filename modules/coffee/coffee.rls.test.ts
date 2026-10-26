import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/types/database";

/**
 * RLS integration tests for the coffee module. Fixed Family scope: any
 * signed-in member reads and writes every bean and grind profile; an
 * anonymous client sees and changes nothing. Like the darts suite, these hit
 * a live local Supabase stack and are kept out of the default `vitest run`:
 *
 *   supabase start
 *   SUPABASE_SERVICE_ROLE_KEY=<local service_role key> \
 *   SUPABASE_ANON_KEY=<local anon key> \
 *   vitest run modules/coffee/coffee.rls.test.ts
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const PASSWORD = "coffee-rls-test-password-1!";

const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY);

type Member = { id: string; client: SupabaseClient<Database> };

async function createMember(label: string): Promise<Member> {
  const email = `coffee-rls-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

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

/** Inserts a bean with one profile via the service-role client, bypassing RLS. */
async function createBean() {
  const { data: bean, error } = await admin
    .from("coffee_bean")
    .insert({ name: "RLS test bean" })
    .select("id")
    .single();
  if (error) throw error;

  const { data: profile, error: profileError } = await admin
    .from("coffee_grind_profile")
    .insert({ bean_id: bean.id, label: "Drip", grind_size: 11.5 })
    .select("id")
    .single();
  if (profileError) throw profileError;

  return { beanId: bean.id, profileId: profile.id };
}

describe("coffee RLS", () => {
  let alice: Member;
  let bob: Member;
  const anon = createClient<Database>(SUPABASE_URL, ANON_KEY);
  let leftoverBeanIds: string[] = [];

  beforeAll(async () => {
    alice = await createMember("alice");
    bob = await createMember("bob");
  });

  afterEach(async () => {
    for (const id of leftoverBeanIds) {
      await admin.from("coffee_bean").delete().eq("id", id);
    }
    leftoverBeanIds = [];
  });

  afterAll(async () => {
    for (const member of [alice, bob]) {
      await admin.auth.admin.deleteUser(member.id);
    }
  });

  it("lets any signed-in member read a bean and its profiles", async () => {
    const { beanId } = await createBean();
    leftoverBeanIds.push(beanId);

    const beans = await bob.client
      .from("coffee_bean")
      .select("id")
      .eq("id", beanId);
    const profiles = await bob.client
      .from("coffee_grind_profile")
      .select("id")
      .eq("bean_id", beanId);

    expect(beans.error).toBeNull();
    expect(beans.data).toHaveLength(1);
    expect(profiles.error).toBeNull();
    expect(profiles.data).toHaveLength(1);
  });

  it("hides beans and profiles from an anonymous client", async () => {
    const { beanId } = await createBean();
    leftoverBeanIds.push(beanId);

    const beans = await anon.from("coffee_bean").select("id").eq("id", beanId);
    const profiles = await anon
      .from("coffee_grind_profile")
      .select("id")
      .eq("bean_id", beanId);

    expect(beans.data ?? []).toHaveLength(0);
    expect(profiles.data ?? []).toHaveLength(0);
  });

  it("lets any signed-in member create a bean and a profile", async () => {
    const { data: bean, error } = await alice.client
      .from("coffee_bean")
      .insert({ name: "Alice's bean", roast_level: "dark" })
      .select("id")
      .single();
    expect(error).toBeNull();
    if (bean) leftoverBeanIds.push(bean.id);

    const { error: profileError } = await bob.client
      .from("coffee_grind_profile")
      .insert({ bean_id: bean!.id, label: "Espresso", grind_size: 5 });
    expect(profileError).toBeNull();
  });

  it("blocks an anonymous client from inserting", async () => {
    const { data, error } = await anon
      .from("coffee_bean")
      .insert({ name: "Anon bean" })
      .select("id")
      .single();

    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("lets a different member update a bean and a profile", async () => {
    const { beanId, profileId } = await createBean();
    leftoverBeanIds.push(beanId);

    const bean = await bob.client
      .from("coffee_bean")
      .update({ notes: "edited" }, { count: "exact" })
      .eq("id", beanId);
    const profile = await bob.client
      .from("coffee_grind_profile")
      .update({ grind_size: 12 }, { count: "exact" })
      .eq("id", profileId);

    expect(bean.error).toBeNull();
    expect(bean.count).toBe(1);
    expect(profile.error).toBeNull();
    expect(profile.count).toBe(1);
  });

  it("blocks an anonymous client from updating or deleting", async () => {
    const { beanId } = await createBean();
    leftoverBeanIds.push(beanId);

    const update = await anon
      .from("coffee_bean")
      .update({ notes: "hacked" }, { count: "exact" })
      .eq("id", beanId);
    const del = await anon
      .from("coffee_bean")
      .delete({ count: "exact" })
      .eq("id", beanId);

    expect(update.count ?? 0).toBe(0);
    expect(del.count ?? 0).toBe(0);
  });

  it("cascades a bean delete to its profiles", async () => {
    const { beanId } = await createBean();

    const { error, count } = await alice.client
      .from("coffee_bean")
      .delete({ count: "exact" })
      .eq("id", beanId);
    expect(error).toBeNull();
    expect(count).toBe(1);

    const { data } = await admin
      .from("coffee_grind_profile")
      .select("id")
      .eq("bean_id", beanId);
    expect(data).toHaveLength(0);
  });

  it("rejects a blank name, a bad roast level and an out-of-range grind size", async () => {
    const blank = await alice.client
      .from("coffee_bean")
      .insert({ name: "   " });
    const badRoast = await alice.client
      .from("coffee_bean")
      .insert({ name: "x", roast_level: "burnt" });
    expect(blank.error).not.toBeNull();
    expect(badRoast.error).not.toBeNull();

    const { beanId } = await createBean();
    leftoverBeanIds.push(beanId);
    const tooCoarse = await alice.client
      .from("coffee_grind_profile")
      .insert({ bean_id: beanId, label: "x", grind_size: 100 });
    expect(tooCoarse.error).not.toBeNull();
  });

  it("allows duplicate profile labels on one bean", async () => {
    const { beanId } = await createBean();
    leftoverBeanIds.push(beanId);

    const { error } = await alice.client
      .from("coffee_grind_profile")
      .insert({ bean_id: beanId, label: "Drip", grind_size: 12 });
    expect(error).toBeNull();
  });
});
