import { describe, expect, it, vi } from "vitest";

const getClaims = vi.fn();

vi.mock("@/platform/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ auth: { getClaims } }),
}));

const { getCurrentMember } = await import("@/platform/auth");

describe("getCurrentMember", () => {
  it("returns the member for a valid session", async () => {
    getClaims.mockResolvedValueOnce({
      data: { claims: { sub: "member-1", email: "member@example.com" } },
      error: null,
    });

    await expect(getCurrentMember()).resolves.toEqual({
      id: "member-1",
      email: "member@example.com",
    });
  });

  it("returns null when signed out", async () => {
    getClaims.mockResolvedValueOnce({
      data: null,
      error: new Error("no session"),
    });

    await expect(getCurrentMember()).resolves.toBeNull();
  });
});
