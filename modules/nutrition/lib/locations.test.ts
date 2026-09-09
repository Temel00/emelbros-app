import { describe, expect, it } from "vitest";

import {
  DEFAULT_PANTRY_LOCATION,
  getPantryLocation,
  pantryLocations,
} from "@/modules/nutrition/lib/locations";

describe("pantry location registry", () => {
  it("offers the four v1 locations from the spec", () => {
    expect(pantryLocations().map((loc) => loc.key)).toEqual([
      "fridge",
      "freezer",
      "pantry",
      "other",
    ]);
  });

  it("resolves a known key to its label and icon", () => {
    expect(getPantryLocation("freezer")).toEqual({
      key: "freezer",
      label: "Freezer",
      icon: "Snowflake",
    });
  });

  it("falls back for an unknown key without losing it", () => {
    // Locations are additive and forgiving (§10): a row stored under a key
    // since removed from the registry still renders and still round-trips.
    expect(getPantryLocation("cellar")).toEqual({
      key: "cellar",
      label: "Other",
      icon: "Package",
    });
  });

  it("defaults new items to a registered location", () => {
    expect(pantryLocations().map((loc) => loc.key)).toContain(
      DEFAULT_PANTRY_LOCATION,
    );
  });
});
