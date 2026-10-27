import { describe, expect, it } from "vitest";

import { fitWithin } from "./photo-resize";

describe("fitWithin", () => {
  it("leaves a smaller image alone", () => {
    expect(fitWithin(500, 800)).toEqual({ width: 500, height: 800 });
  });

  it("scales a 3:4 phone photo down to the width limit", () => {
    expect(fitWithin(3024, 4032)).toEqual({ width: 1080, height: 1440 });
  });

  it("fits a 9:16 portrait exactly", () => {
    expect(fitWithin(2160, 3840)).toEqual({ width: 1080, height: 1920 });
  });

  it("is bound by width for a landscape photo", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1080, height: 810 });
  });

  it("fits the blur thumbnail box", () => {
    expect(fitWithin(1080, 1920, 16, 16)).toEqual({ width: 9, height: 16 });
  });

  it("never returns a zero dimension", () => {
    expect(fitWithin(10000, 10, 16, 16)).toEqual({ width: 16, height: 1 });
  });
});
