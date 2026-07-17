import { describe, expect, it, vi } from "vitest";

const getCurrentMember = vi.fn();
const getPins = vi.fn();
const insertPin = vi.fn();
const deletePin = vi.fn();
const updatePinPosition = vi.fn();
const revalidatePath = vi.fn();

vi.mock("@/platform/auth", () => ({ getCurrentMember }));
vi.mock("@/platform/queries", () => ({
  getPins,
  insertPin,
  deletePin,
  updatePinPosition,
}));
vi.mock("@/platform/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({}),
}));
vi.mock("next/cache", () => ({ revalidatePath }));

const { pinItem, unpinItem, reorderPins } = await import("@/platform/pins");

const MEMBER = { id: "member-1", email: "member@example.com" };

describe("pinItem", () => {
  it("appends after the existing pins of the same kind", async () => {
    getCurrentMember.mockResolvedValueOnce(MEMBER);
    getPins.mockResolvedValueOnce([
      {
        id: "p1",
        member_id: "member-1",
        module: "darts",
        widget: null,
        position: 0,
      },
      {
        id: "p2",
        member_id: "member-1",
        module: "lists",
        widget: null,
        position: 1,
      },
      {
        id: "p3",
        member_id: "member-1",
        module: "darts",
        widget: "career",
        position: 0,
      },
    ]);

    await pinItem("habits", null);

    expect(insertPin).toHaveBeenCalledWith(
      {},
      { memberId: "member-1", module: "habits", widget: null, position: 2 },
    );
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("counts widget pins separately from tile pins", async () => {
    getCurrentMember.mockResolvedValueOnce(MEMBER);
    getPins.mockResolvedValueOnce([
      {
        id: "p1",
        member_id: "member-1",
        module: "darts",
        widget: null,
        position: 0,
      },
      {
        id: "p3",
        member_id: "member-1",
        module: "darts",
        widget: "career",
        position: 0,
      },
    ]);

    await pinItem("darts", "today");

    expect(insertPin).toHaveBeenCalledWith(
      {},
      { memberId: "member-1", module: "darts", widget: "today", position: 1 },
    );
  });

  it("throws when signed out", async () => {
    getCurrentMember.mockResolvedValueOnce(null);

    await expect(pinItem("habits", null)).rejects.toThrow("Not signed in");
  });
});

describe("unpinItem", () => {
  it("deletes the pin and revalidates", async () => {
    getCurrentMember.mockResolvedValueOnce(MEMBER);

    await unpinItem("darts", null);

    expect(deletePin).toHaveBeenCalledWith({}, "member-1", "darts", null);
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });
});

describe("reorderPins", () => {
  it("writes each id's array index as its new position", async () => {
    getCurrentMember.mockResolvedValueOnce(MEMBER);

    await reorderPins(["p2", "p1", "p3"]);

    expect(updatePinPosition).toHaveBeenNthCalledWith(1, {}, "p2", 0);
    expect(updatePinPosition).toHaveBeenNthCalledWith(2, {}, "p1", 1);
    expect(updatePinPosition).toHaveBeenNthCalledWith(3, {}, "p3", 2);
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("throws when signed out", async () => {
    getCurrentMember.mockResolvedValueOnce(null);

    await expect(reorderPins(["p1"])).rejects.toThrow("Not signed in");
  });
});
