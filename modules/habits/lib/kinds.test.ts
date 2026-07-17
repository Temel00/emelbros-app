import { describe, expect, it } from "vitest";

import { getTrackableKind, trackableKinds } from "@/modules/habits/lib/kinds";

describe("trackableKinds", () => {
  it("ships the four v1 kinds", () => {
    expect(trackableKinds.map((k) => k.key)).toEqual([
      "habit",
      "weight",
      "sleep",
      "exercise",
    ]);
  });

  it("habit is the only scheduled, boolean kind", () => {
    const scheduled = trackableKinds.filter((k) => k.scheduled);
    expect(scheduled.map((k) => k.key)).toEqual(["habit"]);
    expect(trackableKinds.find((k) => k.key === "habit")?.valueType).toBe(
      "boolean",
    );
  });

  it("metrics are unscheduled numeric kinds with a unit", () => {
    for (const key of ["weight", "sleep", "exercise"]) {
      const kind = trackableKinds.find((k) => k.key === key);
      expect(kind?.valueType).toBe("number");
      expect(kind?.scheduled).toBe(false);
      expect(kind?.unit).toBeTruthy();
    }
  });
});

describe("getTrackableKind", () => {
  it("looks up a known kind by key", () => {
    expect(getTrackableKind("weight")).toEqual(
      trackableKinds.find((k) => k.key === "weight"),
    );
  });

  it("falls back to a forgiving default for an unknown key, keeping the key", () => {
    const fallback = getTrackableKind("mood");

    expect(fallback.key).toBe("mood");
    expect(fallback.valueType).toBe("boolean");
    expect(fallback.scheduled).toBe(false);
  });
});
