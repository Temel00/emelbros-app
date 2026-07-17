import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentMember = vi.fn();
const revalidatePath = vi.fn();

const insertList = vi.fn();
const updateListTitle = vi.fn();
const updateListKind = vi.fn();
const updateListScope = vi.fn();
const setListArchived = vi.fn();
const deleteList = vi.fn();
const addParticipant = vi.fn();
const removeParticipant = vi.fn();
const getListItems = vi.fn();
const insertItem = vi.fn();
const updateItemText = vi.fn();
const setItemChecked = vi.fn();
const deleteItem = vi.fn();
const updateItemPosition = vi.fn();
const uncheckAllItems = vi.fn();
const clearCheckedItems = vi.fn();

vi.mock("@/platform/auth", () => ({ getCurrentMember }));
vi.mock("@/platform/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({}),
}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/modules/lists/queries", () => ({
  insertList,
  updateListTitle,
  updateListKind,
  updateListScope,
  setListArchived,
  deleteList,
  addParticipant,
  removeParticipant,
  getListItems,
  insertItem,
  updateItemText,
  setItemChecked,
  deleteItem,
  updateItemPosition,
  uncheckAllItems,
  clearCheckedItems,
}));

const {
  addItemAction,
  addParticipantAction,
  archiveListAction,
  changeListKindAction,
  changeListScopeAction,
  clearCheckedAction,
  createListAction,
  deleteItemAction,
  deleteListAction,
  removeParticipantAction,
  renameListAction,
  reorderItemsAction,
  toggleItemCheckedAction,
  unarchiveListAction,
  uncheckAllAction,
  updateItemTextAction,
} = await import("@/modules/lists/actions");

const MEMBER = { id: "member-1", email: "member@example.com" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createListAction", () => {
  it("creates a list owned by the current member", async () => {
    getCurrentMember.mockResolvedValueOnce(MEMBER);
    insertList.mockResolvedValueOnce({ id: "l1" });

    await createListAction({
      title: "Groceries",
      kind: "shopping",
      scope: "family",
    });

    expect(insertList).toHaveBeenCalledWith(
      {},
      {
        ownerMemberId: "member-1",
        title: "Groceries",
        kind: "shopping",
        scope: "family",
      },
    );
    expect(revalidatePath).toHaveBeenCalledWith("/lists");
  });

  it("rejects a blank title without touching the database", async () => {
    await expect(
      createListAction({ title: "   ", kind: "shopping", scope: "family" }),
    ).rejects.toThrow("Title is required");
    expect(insertList).not.toHaveBeenCalled();
  });

  it("throws when signed out", async () => {
    getCurrentMember.mockResolvedValueOnce(null);

    await expect(
      createListAction({
        title: "Groceries",
        kind: "shopping",
        scope: "family",
      }),
    ).rejects.toThrow("Not signed in");
  });
});

describe("renameListAction", () => {
  it("trims and saves the new title", async () => {
    getCurrentMember.mockResolvedValueOnce(MEMBER);

    await renameListAction("l1", "  Weekly groceries  ");

    expect(updateListTitle).toHaveBeenCalledWith({}, "l1", "Weekly groceries");
    expect(revalidatePath).toHaveBeenCalledWith("/lists");
    expect(revalidatePath).toHaveBeenCalledWith("/lists/l1");
  });

  it("rejects a blank title", async () => {
    await expect(renameListAction("l1", "")).rejects.toThrow(
      "Title is required",
    );
  });
});

describe("changeListKindAction", () => {
  it("updates the kind", async () => {
    getCurrentMember.mockResolvedValueOnce(MEMBER);

    await changeListKindAction("l1", "notes");

    expect(updateListKind).toHaveBeenCalledWith({}, "l1", "notes");
  });
});

describe("changeListScopeAction", () => {
  it("updates the scope", async () => {
    getCurrentMember.mockResolvedValueOnce(MEMBER);

    await changeListScopeAction("l1", "participants");

    expect(updateListScope).toHaveBeenCalledWith({}, "l1", "participants");
  });
});

describe("archiveListAction / unarchiveListAction", () => {
  it("archives", async () => {
    getCurrentMember.mockResolvedValueOnce(MEMBER);

    await archiveListAction("l1");

    expect(setListArchived).toHaveBeenCalledWith({}, "l1", true);
  });

  it("unarchives", async () => {
    getCurrentMember.mockResolvedValueOnce(MEMBER);

    await unarchiveListAction("l1");

    expect(setListArchived).toHaveBeenCalledWith({}, "l1", false);
  });
});

describe("deleteListAction", () => {
  it("deletes the list and revalidates the home listing", async () => {
    getCurrentMember.mockResolvedValueOnce(MEMBER);

    await deleteListAction("l1");

    expect(deleteList).toHaveBeenCalledWith({}, "l1");
    expect(revalidatePath).toHaveBeenCalledWith("/lists");
  });
});

describe("addParticipantAction / removeParticipantAction", () => {
  it("adds a participant", async () => {
    getCurrentMember.mockResolvedValueOnce(MEMBER);

    await addParticipantAction("l1", "m2");

    expect(addParticipant).toHaveBeenCalledWith({}, "l1", "m2");
  });

  it("removes a participant", async () => {
    getCurrentMember.mockResolvedValueOnce(MEMBER);

    await removeParticipantAction("l1", "m2");

    expect(removeParticipant).toHaveBeenCalledWith({}, "l1", "m2");
  });
});

describe("addItemAction", () => {
  it("appends the new item after existing active items", async () => {
    getCurrentMember.mockResolvedValueOnce(MEMBER);
    getListItems.mockResolvedValueOnce([
      { id: "i1", checked: false },
      { id: "i2", checked: false },
    ]);

    await addItemAction("l1", "Milk");

    expect(insertItem).toHaveBeenCalledWith(
      {},
      { listId: "l1", text: "Milk", position: 2 },
    );
  });

  it("counts only active items toward the new item's position", async () => {
    getCurrentMember.mockResolvedValueOnce(MEMBER);
    getListItems.mockResolvedValueOnce([
      { id: "i1", checked: false },
      { id: "i2", checked: true },
    ]);

    await addItemAction("l1", "Milk");

    expect(insertItem).toHaveBeenCalledWith(
      {},
      { listId: "l1", text: "Milk", position: 1 },
    );
  });

  it("rejects blank text", async () => {
    await expect(addItemAction("l1", "  ")).rejects.toThrow(
      "Item text is required",
    );
    expect(insertItem).not.toHaveBeenCalled();
  });
});

describe("updateItemTextAction", () => {
  it("trims and saves the new text", async () => {
    getCurrentMember.mockResolvedValueOnce(MEMBER);

    await updateItemTextAction("l1", "i1", "  Oat milk  ");

    expect(updateItemText).toHaveBeenCalledWith({}, "i1", "Oat milk");
  });
});

describe("toggleItemCheckedAction", () => {
  it("checks an item without touching its position", async () => {
    getCurrentMember.mockResolvedValueOnce(MEMBER);

    await toggleItemCheckedAction("l1", "i1", true);

    expect(setItemChecked).toHaveBeenCalledWith({}, "i1", true);
    expect(updateItemPosition).not.toHaveBeenCalled();
  });

  it("unchecking places the item at the end of the active items", async () => {
    getCurrentMember.mockResolvedValueOnce(MEMBER);
    getListItems.mockResolvedValueOnce([
      { id: "i1", checked: true },
      { id: "i2", checked: false },
      { id: "i3", checked: false },
    ]);

    await toggleItemCheckedAction("l1", "i1", false);

    expect(setItemChecked).toHaveBeenCalledWith({}, "i1", false);
    expect(updateItemPosition).toHaveBeenCalledWith({}, "i1", 2);
  });
});

describe("deleteItemAction", () => {
  it("deletes the item", async () => {
    getCurrentMember.mockResolvedValueOnce(MEMBER);

    await deleteItemAction("l1", "i1");

    expect(deleteItem).toHaveBeenCalledWith({}, "i1");
  });
});

describe("reorderItemsAction", () => {
  it("writes each id's array index as its new position", async () => {
    getCurrentMember.mockResolvedValueOnce(MEMBER);

    await reorderItemsAction("l1", ["i2", "i1", "i3"]);

    expect(updateItemPosition).toHaveBeenNthCalledWith(1, {}, "i2", 0);
    expect(updateItemPosition).toHaveBeenNthCalledWith(2, {}, "i1", 1);
    expect(updateItemPosition).toHaveBeenNthCalledWith(3, {}, "i3", 2);
  });
});

describe("uncheckAllAction", () => {
  it("resets checked items on the list", async () => {
    getCurrentMember.mockResolvedValueOnce(MEMBER);

    await uncheckAllAction("l1");

    expect(uncheckAllItems).toHaveBeenCalledWith({}, "l1");
  });
});

describe("clearCheckedAction", () => {
  it("deletes checked items on the list", async () => {
    getCurrentMember.mockResolvedValueOnce(MEMBER);

    await clearCheckedAction("l1");

    expect(clearCheckedItems).toHaveBeenCalledWith({}, "l1");
  });
});
