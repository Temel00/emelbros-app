import { describe, expect, it, vi } from "vitest";

import { getProfile } from "@/platform/queries";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

function fakeSupabase(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return { from } as unknown as SupabaseClient<Database>;
}

describe("getProfile", () => {
  it("returns data on success", async () => {
    const profile = { id: "member-1", accent: "pink", created_at: "now" };
    const supabase = fakeSupabase({ data: profile, error: null });

    await expect(getProfile(supabase, "member-1")).resolves.toEqual(profile);
  });

  it("throws on a forced error", async () => {
    const supabase = fakeSupabase({
      data: null,
      error: new Error("forced failure"),
    });

    await expect(getProfile(supabase, "member-1")).rejects.toThrow(
      "forced failure",
    );
  });
});
