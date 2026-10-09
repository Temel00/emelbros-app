import { describe, expect, it } from "vitest";

import { DRAFT_KEY, STARTER_SVG, loadDraft, saveDraft } from "./draft";

const memory = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
};

const throwing = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
};

describe("draft", () => {
  it("falls back to the starter SVG with nothing saved", () => {
    expect(loadDraft(memory())).toBe(STARTER_SVG);
  });

  it("round-trips a saved draft", () => {
    const s = memory();
    saveDraft("<svg/>", s);
    expect(s.getItem(DRAFT_KEY)).toBe("<svg/>");
    expect(loadDraft(s)).toBe("<svg/>");
  });

  it("treats an empty saved draft as absent", () => {
    const s = memory();
    saveDraft("", s);
    expect(loadDraft(s)).toBe(STARTER_SVG);
  });

  it("survives storage that throws", () => {
    expect(() => saveDraft("x", throwing)).not.toThrow();
    expect(loadDraft(throwing)).toBe(STARTER_SVG);
  });

  it("survives no storage at all", () => {
    expect(() => saveDraft("x", null)).not.toThrow();
    expect(loadDraft(null)).toBe(STARTER_SVG);
  });
});
