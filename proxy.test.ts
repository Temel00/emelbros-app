import { describe, expect, it } from "vitest";

import { isPublicPath } from "@/proxy";

describe("isPublicPath", () => {
  it("allows the sign-in page", () => {
    expect(isPublicPath("/sign-in")).toBe(true);
  });

  it("allows the oauth callback route", () => {
    expect(isPublicPath("/auth/callback")).toBe(true);
  });

  it("allows the PWA manifest", () => {
    expect(isPublicPath("/manifest.webmanifest")).toBe(true);
  });

  it("rejects protected routes", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/darts")).toBe(false);
  });

  it("does not match unrelated paths by prefix", () => {
    expect(isPublicPath("/sign-in-other")).toBe(false);
  });
});
