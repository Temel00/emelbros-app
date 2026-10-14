import { describe, expect, it } from "vitest";

import { EMPTY_PREVIEW, nextPreview } from "./hot-reload";

const tag = (t: string) => `[${t}]`;

describe("nextPreview", () => {
  it("renders valid text through the sanitiser", () => {
    const s = nextPreview(EMPTY_PREVIEW, "<svg/>", tag);
    expect(s).toEqual({ html: "[<svg/>]", viewBox: null, error: null });
  });

  it("keeps the last good render when text turns invalid", () => {
    const good = nextPreview(EMPTY_PREVIEW, "<svg/>", tag);
    const bad = nextPreview(good, "<svg><g></svg>", tag);
    expect(bad.html).toBe(good.html);
    expect(bad.error).toMatchObject({ line: 1 });
    expect(bad.error?.message).toBeTruthy();
  });

  it("clears the error on the next valid parse", () => {
    const good = nextPreview(EMPTY_PREVIEW, "<svg/>", tag);
    const bad = nextPreview(good, "<svg>", tag);
    const fixed = nextPreview(bad, "<svg><g/></svg>", tag);
    expect(fixed).toEqual({
      html: "[<svg><g/></svg>]",
      viewBox: null,
      error: null,
    });
  });

  it("tracks the viewBox of the last good render", () => {
    const good = nextPreview(EMPTY_PREVIEW, '<svg viewBox="0 0 8 4"/>', tag);
    expect(good.viewBox).toEqual({ minX: 0, minY: 0, width: 8, height: 4 });
    expect(nextPreview(good, "<svg", tag).viewBox).toEqual(good.viewBox);
  });

  it("does not call the sanitiser for invalid text", () => {
    let calls = 0;
    nextPreview(EMPTY_PREVIEW, "<svg>", (t) => {
      calls++;
      return t;
    });
    expect(calls).toBe(0);
  });

  it("starts empty when the first text is invalid", () => {
    expect(nextPreview(EMPTY_PREVIEW, "oops", tag).html).toBe("");
  });
});
