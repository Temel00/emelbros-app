import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getPhotoUrl } from "./photo-url";

describe("getPhotoUrl", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co/");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when there is no photo", () => {
    expect(getPhotoUrl(null)).toBeNull();
    expect(getPhotoUrl("")).toBeNull();
  });

  it("builds the public storage URL", () => {
    expect(getPhotoUrl("bean-1/photo.jpg")).toBe(
      "https://abc.supabase.co/storage/v1/object/public/coffee-bag-photos/bean-1/photo.jpg",
    );
  });

  it("throws when the Supabase URL is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(() => getPhotoUrl("a/b.jpg")).toThrow();
  });
});
