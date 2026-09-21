import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/types/database";

/**
 * RLS + guard integration tests for the two managed pantry-field vocabularies
 * (`nutrition_unit`, `nutrition_pantry_location`; #155/#156, ADR-0017). Like
 * the other `*.rls.test.ts` suites these hit a live Supabase stack and are
 * excluded from the default `vitest run` (run with `vitest.rls.config.ts`).
 *
 * Both tables are fixed Family (ADR-0004/0007), identical to the food
 * dictionary: any signed-in member may add, rename, reorder, archive, or
 * delete a row, and signed out neither table exists. The `bystander` member —
 * who created nothing — proves the Family read/write, since there is no owner
 * clause to fall back on.
 *
 * Beyond RLS, this suite pins the DB guards ticket #156's query layer relies
 * on to raise readable errors: the protected-default trigger (the seeded `g` /
 * `fridge` rows can't be deleted or archived) and the `RESTRICT` FK on
 * `nutrition_food.unit` (a unit a food is stated in can't be deleted). Both
 * surface as a non-null error here; the query layer turns that into a message.
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const PASSWORD = "nutrition-rls-test-password-1!";

const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY);

type Member = { id: string; client: SupabaseClient<Database> };

async function createMember(label: string): Promise<Member> {
  const email = `nutrition-vocab-rls-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

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

/** A fresh, collision-proof vocabulary key for a test-created row. */
function freshKey(prefix: string): string {
  return `zz_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

describe("nutrition managed vocabularies RLS", () => {
  let cook: Member;
  let bystander: Member;
  const anonymous = createClient<Database>(SUPABASE_URL, ANON_KEY);

  let leftoverFoodIds: string[] = [];
  let leftoverUnitKeys: string[] = [];
  let leftoverLocationKeys: string[] = [];

  /** Inserts a unit via the service-role client, bypassing RLS. */
  async function createUnit(
    overrides: { dimension?: string; active?: boolean } = {},
  ) {
    const key = freshKey("unit");
    const { error } = await admin.from("nutrition_unit").insert({
      key,
      label: key,
      dimension: overrides.dimension ?? "count",
      sort_order: 500,
      active: overrides.active ?? true,
    });
    if (error) throw error;
    leftoverUnitKeys.push(key);
    return key;
  }

  /** Inserts a location via the service-role client, bypassing RLS. */
  async function createLocation(overrides: { active?: boolean } = {}) {
    const key = freshKey("loc");
    const { error } = await admin.from("nutrition_pantry_location").insert({
      key,
      label: key,
      icon: "Package",
      sort_order: 500,
      active: overrides.active ?? true,
    });
    if (error) throw error;
    leftoverLocationKeys.push(key);
    return key;
  }

  /** Inserts a food stated in the given unit, via service role. */
  async function createFoodInUnit(unitKey: string, creator: Member) {
    const { data, error } = await admin
      .from("nutrition_food")
      .insert({
        name: `Oats ${Math.random().toString(36).slice(2)}`,
        unit: unitKey,
        calories_per_unit: 3.8,
        protein_g_per_unit: 0.13,
        carbs_g_per_unit: 0.68,
        fat_g_per_unit: 0.07,
        created_by: creator.id,
      })
      .select("id")
      .single();
    if (error) throw error;
    leftoverFoodIds.push(data.id as string);
    return data.id as string;
  }

  beforeAll(async () => {
    cook = await createMember("cook");
    bystander = await createMember("bystander");
  });

  afterEach(async () => {
    // Foods first: a food's RESTRICT FK would otherwise block deleting the
    // unit it is stated in.
    for (const id of leftoverFoodIds) {
      await admin.from("nutrition_food").delete().eq("id", id);
    }
    leftoverFoodIds = [];

    for (const key of leftoverUnitKeys) {
      await admin.from("nutrition_unit").delete().eq("key", key);
    }
    leftoverUnitKeys = [];

    for (const key of leftoverLocationKeys) {
      await admin.from("nutrition_pantry_location").delete().eq("key", key);
    }
    leftoverLocationKeys = [];
  });

  afterAll(async () => {
    for (const member of [cook, bystander]) {
      await admin.auth.admin.deleteUser(member.id);
    }
  });

  // === nutrition_unit ================================================

  it("lets any signed-in member add a unit", async () => {
    const key = freshKey("unit");
    leftoverUnitKeys.push(key);

    const { error } = await cook.client.from("nutrition_unit").insert({
      key,
      label: "Handful",
      dimension: "count",
      sort_order: 501,
    });

    expect(error).toBeNull();
  });

  it("lets a member who added nothing read the units (fixed Family)", async () => {
    const key = await createUnit();

    const { data, error } = await bystander.client
      .from("nutrition_unit")
      .select("key")
      .eq("key", key)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.key).toBe(key);
  });

  it("lets a member rename, reorder, and archive a unit someone else added", async () => {
    const key = await createUnit();

    const { error, count } = await bystander.client
      .from("nutrition_unit")
      .update(
        { label: "Renamed", sort_order: 777, active: false },
        { count: "exact" },
      )
      .eq("key", key);

    expect(error).toBeNull();
    expect(count).toBe(1);
  });

  it("lets a member delete a non-protected unit someone else added", async () => {
    const key = await createUnit();

    const { error, count } = await bystander.client
      .from("nutrition_unit")
      .delete({ count: "exact" })
      .eq("key", key);

    expect(error).toBeNull();
    expect(count).toBe(1);
    // Already gone — nothing left to clean up.
    leftoverUnitKeys = leftoverUnitKeys.filter((k) => k !== key);
  });

  it("hides the units from a signed-out caller", async () => {
    const key = await createUnit();

    const { data, error } = await anonymous
      .from("nutrition_unit")
      .select("key")
      .eq("key", key);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("blocks a signed-out caller from adding a unit", async () => {
    const { data, error } = await anonymous
      .from("nutrition_unit")
      .insert({
        key: freshKey("unit"),
        label: "Contraband",
        dimension: "count",
        sort_order: 999,
      })
      .select("key")
      .single();

    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("blocks deleting the protected default unit (g)", async () => {
    const { error } = await cook.client
      .from("nutrition_unit")
      .delete()
      .eq("key", "g");

    expect(error).not.toBeNull();

    const { data } = await admin
      .from("nutrition_unit")
      .select("key")
      .eq("key", "g")
      .maybeSingle();
    expect(data?.key).toBe("g");
  });

  it("blocks archiving the protected default unit (g)", async () => {
    const { error } = await cook.client
      .from("nutrition_unit")
      .update({ active: false })
      .eq("key", "g");

    expect(error).not.toBeNull();

    const { data } = await admin
      .from("nutrition_unit")
      .select("active")
      .eq("key", "g")
      .single();
    expect(data?.active).toBe(true);
  });

  it("blocks deleting a unit a food is stated in (RESTRICT FK)", async () => {
    const key = await createUnit();
    await createFoodInUnit(key, cook);

    const { error } = await cook.client
      .from("nutrition_unit")
      .delete()
      .eq("key", key);

    expect(error).not.toBeNull();

    const { data } = await admin
      .from("nutrition_unit")
      .select("key")
      .eq("key", key)
      .maybeSingle();
    expect(data?.key).toBe(key);
  });

  // === nutrition_pantry_location =====================================

  it("lets any signed-in member add a pantry location", async () => {
    const key = freshKey("loc");
    leftoverLocationKeys.push(key);

    const { error } = await cook.client
      .from("nutrition_pantry_location")
      .insert({ key, label: "Cellar", icon: "Archive", sort_order: 501 });

    expect(error).toBeNull();
  });

  it("lets a member who added nothing read the locations (fixed Family)", async () => {
    const key = await createLocation();

    const { data, error } = await bystander.client
      .from("nutrition_pantry_location")
      .select("key")
      .eq("key", key)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.key).toBe(key);
  });

  it("lets a member rename, re-icon, reorder, and archive a location", async () => {
    const key = await createLocation();

    const { error, count } = await bystander.client
      .from("nutrition_pantry_location")
      .update(
        { label: "Renamed", icon: "Snowflake", sort_order: 777, active: false },
        { count: "exact" },
      )
      .eq("key", key);

    expect(error).toBeNull();
    expect(count).toBe(1);
  });

  it("lets a member delete a non-protected location someone else added", async () => {
    const key = await createLocation();

    const { error, count } = await bystander.client
      .from("nutrition_pantry_location")
      .delete({ count: "exact" })
      .eq("key", key);

    expect(error).toBeNull();
    expect(count).toBe(1);
    leftoverLocationKeys = leftoverLocationKeys.filter((k) => k !== key);
  });

  it("hides the locations from a signed-out caller", async () => {
    const key = await createLocation();

    const { data, error } = await anonymous
      .from("nutrition_pantry_location")
      .select("key")
      .eq("key", key);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("blocks a signed-out caller from adding a location", async () => {
    const { data, error } = await anonymous
      .from("nutrition_pantry_location")
      .insert({
        key: freshKey("loc"),
        label: "Contraband",
        icon: "Package",
        sort_order: 999,
      })
      .select("key")
      .single();

    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("blocks deleting the protected default location (fridge)", async () => {
    const { error } = await cook.client
      .from("nutrition_pantry_location")
      .delete()
      .eq("key", "fridge");

    expect(error).not.toBeNull();

    const { data } = await admin
      .from("nutrition_pantry_location")
      .select("key")
      .eq("key", "fridge")
      .maybeSingle();
    expect(data?.key).toBe("fridge");
  });

  it("blocks archiving the protected default location (fridge)", async () => {
    const { error } = await cook.client
      .from("nutrition_pantry_location")
      .update({ active: false })
      .eq("key", "fridge");

    expect(error).not.toBeNull();

    const { data } = await admin
      .from("nutrition_pantry_location")
      .select("active")
      .eq("key", "fridge")
      .single();
    expect(data?.active).toBe(true);
  });
});
