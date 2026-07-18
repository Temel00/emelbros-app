import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createMemberClient,
  createServiceClient,
} from "@/platform/supabase/test-helpers";

/**
 * RLS integration suite for the lists module (#13, #34, lists.md §2). Runs
 * against a local Supabase stack (`supabase start`) — excluded from the
 * default `npm run test` run by `vitest.config.ts`; wiring it into CI is
 * tracked by #13.
 */
describe("lists RLS", () => {
  const service = createServiceClient();
  const run = Date.now();

  let owner: Awaited<ReturnType<typeof createMemberClient>>;
  let participant: Awaited<ReturnType<typeof createMemberClient>>;
  let outsider: Awaited<ReturnType<typeof createMemberClient>>;

  beforeAll(async () => {
    owner = await createMemberClient(service, `lists-owner-${run}@example.com`);
    participant = await createMemberClient(
      service,
      `lists-participant-${run}@example.com`,
    );
    outsider = await createMemberClient(
      service,
      `lists-outsider-${run}@example.com`,
    );
  });

  afterAll(async () => {
    for (const member of [owner, participant, outsider]) {
      await service.auth.admin.deleteUser(member.id);
    }
  });

  async function createList(
    scope: "private" | "participants" | "family",
    title: string,
  ) {
    const { data, error } = await owner.client
      .from("lists_list")
      .insert({ owner_member_id: owner.id, title, kind: "todo", scope })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  it("hides a private list from a non-owner", async () => {
    const list = await createList("private", "Private list");

    const { data } = await outsider.client
      .from("lists_list")
      .select()
      .eq("id", list.id);

    expect(data).toEqual([]);
  });

  it("shows a family-scope list to any member", async () => {
    const list = await createList("family", "Family list");

    const { data, error } = await outsider.client
      .from("lists_list")
      .select()
      .eq("id", list.id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("shows a participants-scope list only to a listed participant", async () => {
    const list = await createList("participants", "Participants list");
    await owner.client
      .from("lists_participant")
      .insert({ list_id: list.id, member_id: participant.id });

    const { data: visible } = await participant.client
      .from("lists_list")
      .select()
      .eq("id", list.id);
    expect(visible).toHaveLength(1);

    const { data: hidden } = await outsider.client
      .from("lists_list")
      .select()
      .eq("id", list.id);
    expect(hidden).toEqual([]);
  });

  it("only the owner can rename, change scope, or delete a list", async () => {
    const list = await createList("family", "Owner-only actions");

    const { error: renameError } = await participant.client
      .from("lists_list")
      .update({ title: "Renamed by non-owner" })
      .eq("id", list.id);
    expect(renameError).toBeNull();

    const { data: unchanged } = await service
      .from("lists_list")
      .select("title")
      .eq("id", list.id)
      .single();
    expect(unchanged?.title).toBe("Owner-only actions");

    const { error: deleteError } = await participant.client
      .from("lists_list")
      .delete()
      .eq("id", list.id);
    expect(deleteError).toBeNull();

    const { data: stillThere } = await service
      .from("lists_list")
      .select("id")
      .eq("id", list.id)
      .single();
    expect(stillThere?.id).toBe(list.id);

    const { error: ownerRenameError } = await owner.client
      .from("lists_list")
      .update({ title: "Renamed by owner" })
      .eq("id", list.id);
    expect(ownerRenameError).toBeNull();

    const { data: renamed } = await service
      .from("lists_list")
      .select("title")
      .eq("id", list.id)
      .single();
    expect(renamed?.title).toBe("Renamed by owner");
  });

  it("lets any viewer add and check off items on a visible list", async () => {
    const list = await createList("family", "Shared shopping list");

    const { data: item, error: insertError } = await participant.client
      .from("lists_item")
      .insert({ list_id: list.id, text: "Milk", position: 0 })
      .select()
      .single();
    expect(insertError).toBeNull();
    expect(item?.text).toBe("Milk");

    const { error: checkError } = await outsider.client
      .from("lists_item")
      .update({ checked: true })
      .eq("id", item!.id);
    expect(checkError).toBeNull();

    const { data: checked } = await service
      .from("lists_item")
      .select("checked")
      .eq("id", item!.id)
      .single();
    expect(checked?.checked).toBe(true);
  });

  it("bumps the parent list's updated_at on a non-owner's item write", async () => {
    // "Most-recently-active first" (lists.md §6): item activity — even by a
    // non-owner collaborator — must resurface the list, despite lists_list
    // UPDATE being owner-only. The security-definer touch trigger is what
    // makes that write land.
    const list = await createList("family", "Active shopping list");

    const { data: before } = await service
      .from("lists_list")
      .select("updated_at")
      .eq("id", list.id)
      .single();

    await new Promise((resolve) => setTimeout(resolve, 10));

    const { error: insertError } = await outsider.client
      .from("lists_item")
      .insert({ list_id: list.id, text: "Bread", position: 0 });
    expect(insertError).toBeNull();

    const { data: after } = await service
      .from("lists_list")
      .select("updated_at")
      .eq("id", list.id)
      .single();

    expect(new Date(after!.updated_at).getTime()).toBeGreaterThan(
      new Date(before!.updated_at).getTime(),
    );
  });

  it("hides items belonging to a private list from a non-owner", async () => {
    const list = await createList("private", "Private with items");
    await owner.client
      .from("lists_item")
      .insert({ list_id: list.id, text: "Secret", position: 0 });

    const { data } = await outsider.client
      .from("lists_item")
      .select()
      .eq("list_id", list.id);

    expect(data).toEqual([]);
  });
});
