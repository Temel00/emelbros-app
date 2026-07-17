import { describe, expect, it, vi } from "vitest";

import {
  addParticipant,
  clearCheckedItems,
  deleteItem,
  deleteList,
  getArchivedLists,
  getList,
  getListItems,
  getListParticipants,
  getOtherProfiles,
  getVisibleLists,
  insertItem,
  insertList,
  removeParticipant,
  setItemChecked,
  setListArchived,
  uncheckAllItems,
  updateItemPosition,
  updateItemText,
  updateListKind,
  updateListScope,
  updateListTitle,
} from "@/modules/lists/queries";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Mirrors platform/queries.test.ts's chainable stand-in: stays chainable
// through any number of `.eq()`/`.neq()`/`.not()`/`.is()`/`.order()` calls
// and resolves to `result` when awaited or `.single()`/`.maybeSingle()`'d.
function fakeSupabaseClient(result: { data?: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve),
  };
  chain.eq = vi.fn(() => chain);
  chain.neq = vi.fn(() => chain);
  chain.not = vi.fn(() => chain);
  chain.is = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.single = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);

  const select = vi.fn(() => chain);
  const insert = vi.fn(() => chain);
  const del = vi.fn(() => chain);
  const update = vi.fn((payload: Record<string, unknown>) => {
    void payload;
    return chain;
  });
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

describe("getVisibleLists", () => {
  it("returns non-archived lists", async () => {
    const lists = [{ id: "l1", title: "Groceries" }];
    const { client, chain } = fakeSupabaseClient({ data: lists, error: null });

    await expect(getVisibleLists(client)).resolves.toEqual(lists);
    expect(chain.is).toHaveBeenCalledWith("archived_at", null);
  });

  it("throws on a forced error", async () => {
    const { client } = fakeSupabaseClient({
      data: null,
      error: new Error("forced failure"),
    });

    await expect(getVisibleLists(client)).rejects.toThrow("forced failure");
  });
});

describe("getArchivedLists", () => {
  it("filters to archived lists", async () => {
    const { client, chain } = fakeSupabaseClient({ data: [], error: null });

    await getArchivedLists(client);

    expect(chain.not).toHaveBeenCalledWith("archived_at", "is", null);
  });
});

describe("getList", () => {
  it("returns a single list by id", async () => {
    const list = { id: "l1", title: "Groceries" };
    const { client } = fakeSupabaseClient({ data: list, error: null });

    await expect(getList(client, "l1")).resolves.toEqual(list);
  });

  it("returns null when RLS hides the row", async () => {
    const { client } = fakeSupabaseClient({ data: null, error: null });

    await expect(getList(client, "l1")).resolves.toBeNull();
  });
});

describe("insertList", () => {
  it("inserts a list row scoped to the owner", async () => {
    const { client, insert } = fakeSupabaseClient({
      data: { id: "l1" },
      error: null,
    });

    await insertList(client, {
      ownerMemberId: "m1",
      title: "Groceries",
      kind: "shopping",
      scope: "family",
    });

    expect(insert).toHaveBeenCalledWith({
      owner_member_id: "m1",
      title: "Groceries",
      kind: "shopping",
      scope: "family",
    });
  });
});

describe("updateListTitle", () => {
  it("updates the title", async () => {
    const { client, update, chain } = fakeSupabaseClient({ error: null });

    await updateListTitle(client, "l1", "Renamed");

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Renamed" }),
    );
    expect(chain.eq).toHaveBeenCalledWith("id", "l1");
  });
});

describe("updateListKind", () => {
  it("updates the kind", async () => {
    const { client, update } = fakeSupabaseClient({ error: null });

    await updateListKind(client, "l1", "notes");

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "notes" }),
    );
  });
});

describe("updateListScope", () => {
  it("updates the scope", async () => {
    const { client, update } = fakeSupabaseClient({ error: null });

    await updateListScope(client, "l1", "participants");

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "participants" }),
    );
  });
});

describe("setListArchived", () => {
  it("sets archived_at when archiving", async () => {
    const { client, update } = fakeSupabaseClient({ error: null });

    await setListArchived(client, "l1", true);

    const call = update.mock.calls[0][0];
    expect(call.archived_at).not.toBeNull();
  });

  it("clears archived_at when unarchiving", async () => {
    const { client, update } = fakeSupabaseClient({ error: null });

    await setListArchived(client, "l1", false);

    expect(update).toHaveBeenCalledWith({ archived_at: null });
  });
});

describe("deleteList", () => {
  it("deletes the list by id", async () => {
    const { client, delete: del, chain } = fakeSupabaseClient({ error: null });

    await deleteList(client, "l1");

    expect(del).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "l1");
  });
});

describe("getListParticipants", () => {
  it("returns participant rows for a list", async () => {
    const rows = [{ list_id: "l1", member_id: "m2" }];
    const { client } = fakeSupabaseClient({ data: rows, error: null });

    await expect(getListParticipants(client, "l1")).resolves.toEqual(rows);
  });
});

describe("getOtherProfiles", () => {
  it("excludes the given member id", async () => {
    const { client, chain } = fakeSupabaseClient({ data: [], error: null });

    await getOtherProfiles(client, "m1");

    expect(chain.neq).toHaveBeenCalledWith("id", "m1");
  });
});

describe("addParticipant", () => {
  it("inserts a participant row", async () => {
    const { client, insert } = fakeSupabaseClient({ error: null });

    await addParticipant(client, "l1", "m2");

    expect(insert).toHaveBeenCalledWith({ list_id: "l1", member_id: "m2" });
  });
});

describe("removeParticipant", () => {
  it("deletes the matching participant row", async () => {
    const { client, chain } = fakeSupabaseClient({ error: null });

    await removeParticipant(client, "l1", "m2");

    expect(chain.eq).toHaveBeenCalledWith("list_id", "l1");
    expect(chain.eq).toHaveBeenCalledWith("member_id", "m2");
  });
});

describe("getListItems", () => {
  it("orders active items by position, then checked items", async () => {
    const { client, chain } = fakeSupabaseClient({ data: [], error: null });

    await getListItems(client, "l1");

    expect(chain.order).toHaveBeenNthCalledWith(1, "checked", {
      ascending: true,
    });
    expect(chain.order).toHaveBeenNthCalledWith(2, "position", {
      ascending: true,
    });
  });
});

describe("insertItem", () => {
  it("inserts an item at the given position", async () => {
    const { client, insert } = fakeSupabaseClient({
      data: { id: "i1" },
      error: null,
    });

    await insertItem(client, { listId: "l1", text: "Milk", position: 0 });

    expect(insert).toHaveBeenCalledWith({
      list_id: "l1",
      text: "Milk",
      position: 0,
    });
  });
});

describe("updateItemText", () => {
  it("updates the text", async () => {
    const { client, update } = fakeSupabaseClient({ error: null });

    await updateItemText(client, "i1", "Oat milk");

    expect(update).toHaveBeenCalledWith({ text: "Oat milk" });
  });
});

describe("setItemChecked", () => {
  it("updates the checked flag", async () => {
    const { client, update } = fakeSupabaseClient({ error: null });

    await setItemChecked(client, "i1", true);

    expect(update).toHaveBeenCalledWith({ checked: true });
  });
});

describe("updateItemPosition", () => {
  it("updates the position", async () => {
    const { client, update } = fakeSupabaseClient({ error: null });

    await updateItemPosition(client, "i1", 3);

    expect(update).toHaveBeenCalledWith({ position: 3 });
  });
});

describe("deleteItem", () => {
  it("deletes the item by id", async () => {
    const { client, chain } = fakeSupabaseClient({ error: null });

    await deleteItem(client, "i1");

    expect(chain.eq).toHaveBeenCalledWith("id", "i1");
  });
});

describe("uncheckAllItems", () => {
  it("resets every checked item on the list", async () => {
    const { client, update, chain } = fakeSupabaseClient({ error: null });

    await uncheckAllItems(client, "l1");

    expect(update).toHaveBeenCalledWith({ checked: false });
    expect(chain.eq).toHaveBeenCalledWith("list_id", "l1");
    expect(chain.eq).toHaveBeenCalledWith("checked", true);
  });
});

describe("clearCheckedItems", () => {
  it("deletes every checked item on the list", async () => {
    const { client, delete: del, chain } = fakeSupabaseClient({ error: null });

    await clearCheckedItems(client, "l1");

    expect(del).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("list_id", "l1");
    expect(chain.eq).toHaveBeenCalledWith("checked", true);
  });
});
