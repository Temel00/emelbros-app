import { describe, expect, it } from "vitest";

import { createHistory } from "./history";

const snap = (original: string, changed = "") => ({ original, changed });

function setup(opts = {}) {
  let t = 1000;
  const h = createHistory(snap(""), { now: () => t, ...opts });
  return { h, tick: (ms: number) => (t += ms) };
}

describe("history", () => {
  it("undoes and redoes snapshots", () => {
    const { h, tick } = setup();
    h.push(snap("a"), "original");
    tick(1000);
    h.push(snap("a", "b"), "changed");
    expect(h.undo()).toEqual({ snapshot: snap("a"), side: "changed" });
    expect(h.undo()).toEqual({ snapshot: snap(""), side: "original" });
    expect(h.undo()).toBeNull();
    expect(h.redo()?.snapshot).toEqual(snap("a"));
    expect(h.redo()?.snapshot).toEqual(snap("a", "b"));
    expect(h.redo()).toBeNull();
  });

  it("merges pushes within the window into one step", () => {
    const { h, tick } = setup();
    h.push(snap("a"), "original");
    tick(200);
    h.push(snap("ab"), "original");
    tick(200);
    h.push(snap("abc"), "original");
    expect(h.undo()?.snapshot).toEqual(snap(""));
    expect(h.canUndo()).toBe(false);
    tick(600);
    h.redo();
    h.push(snap("abcd"), "original");
    tick(600);
    h.push(snap("abcde"), "original");
    expect(h.undo()?.snapshot).toEqual(snap("abcd"));
  });

  it("keeps isolated pushes as their own step", () => {
    const { h, tick } = setup();
    h.push(snap("a"), "original");
    tick(10);
    h.push(snap("pasted"), "original", { isolate: true });
    tick(10);
    h.push(snap("pasted!"), "original");
    expect(h.undo()?.snapshot).toEqual(snap("pasted"));
    expect(h.undo()?.snapshot).toEqual(snap("a"));
  });

  it("clears redo on a new push", () => {
    const { h, tick } = setup();
    h.push(snap("a"), "original");
    tick(1000);
    h.push(snap("b"), "original");
    h.undo();
    tick(1000);
    h.push(snap("c"), "changed");
    expect(h.canRedo()).toBe(false);
  });

  it("drops oldest steps over the size cap but keeps the last 3", () => {
    const { h, tick } = setup({ maxChars: 10 });
    for (const text of ["aaaaaa", "bbbbbb", "cccccc", "dddddd"]) {
      tick(1000);
      h.push(snap(text), "original");
    }
    // Only the newest 3 steps survive: two undos reach the oldest.
    expect(h.undo()?.snapshot).toEqual(snap("cccccc"));
    expect(h.undo()?.snapshot).toEqual(snap("bbbbbb"));
    expect(h.undo()).toBeNull();
  });

  it("reports the side last changed", () => {
    const { h } = setup();
    expect(h.lastChanged()).toBeNull();
    h.push(snap("", "x"), "changed");
    expect(h.lastChanged()).toBe("changed");
  });
});
