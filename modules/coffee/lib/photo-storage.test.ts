import { describe, expect, it, vi } from "vitest";

import { buildPhotoPath, removePhotoObject } from "./photo-storage";

function fakeClient(remove: ReturnType<typeof vi.fn>) {
  const from = vi.fn(() => ({ remove }));
  return { client: { storage: { from } }, from };
}

describe("buildPhotoPath", () => {
  it("nests a uuid jpg under the bean id", () => {
    expect(buildPhotoPath("bean-1", "abc")).toBe("bean-1/abc.jpg");
  });
});

describe("removePhotoObject", () => {
  it("removes the object from the bag photo bucket", async () => {
    const remove = vi.fn().mockResolvedValue({ error: null });
    const { client, from } = fakeClient(remove);

    await removePhotoObject(client, "bean-1/abc.jpg");

    expect(from).toHaveBeenCalledWith("coffee-bag-photos");
    expect(remove).toHaveBeenCalledWith(["bean-1/abc.jpg"]);
  });

  it("does nothing when there is no photo", async () => {
    const remove = vi.fn();
    const { client } = fakeClient(remove);

    await removePhotoObject(client, null);

    expect(remove).not.toHaveBeenCalled();
  });

  it("swallows a rejected remove", async () => {
    const remove = vi.fn().mockRejectedValue(new Error("network"));
    const { client } = fakeClient(remove);

    await expect(
      removePhotoObject(client, "bean-1/abc.jpg"),
    ).resolves.toBeUndefined();
  });

  it("ignores an error result", async () => {
    const remove = vi.fn().mockResolvedValue({ error: { message: "nope" } });
    const { client } = fakeClient(remove);

    await expect(
      removePhotoObject(client, "bean-1/abc.jpg"),
    ).resolves.toBeUndefined();
  });
});
