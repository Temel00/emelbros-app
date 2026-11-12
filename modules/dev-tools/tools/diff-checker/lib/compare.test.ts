import { describe, expect, it } from "vitest";

import { MAX_CHAR_DIFF_LINE, compare, type CompareResult } from "./compare";
import { statusOf } from "./status";

const off = { ignoreWhitespace: false, ignoreCase: false };
const ok = (r: CompareResult) => {
  if (r.tooLarge) throw new Error("unexpected too-large");
  return r;
};
const kinds = (r: CompareResult) => ok(r).rows.map((x) => x.kind);

describe("compare", () => {
  it("returns equal rows with 1-based line numbers for identical text", () => {
    const r = ok(compare("a\nb\n", "a\nb\n", off));
    expect(kinds(r)).toEqual(["equal", "equal"]);
    expect(r.rows[1]).toMatchObject({ left: "b", right: "b", leftNo: 2 });
    expect([r.added, r.removed, r.changed]).toEqual([0, 0, 0]);
  });

  it("counts added, removed and paired changed lines", () => {
    const r = ok(compare("a\nb\nc\n", "a\nB\nc\nd\n", off));
    expect(kinds(r)).toEqual(["equal", "changed", "equal", "added"]);
    expect([r.added, r.removed, r.changed]).toEqual([1, 0, 1]);
    const removed = ok(compare("a\nb\n", "a\n", off));
    expect([removed.added, removed.removed, removed.changed]).toEqual([
      0, 1, 0,
    ]);
  });

  it("pairs index-wise within a run; leftovers are plain removed/added", () => {
    const r = ok(compare("x\ny\nz\n", "X\n", off));
    expect(kinds(r)).toEqual(["changed", "removed", "removed"]);
  });

  it("gives char segments for paired lines", () => {
    const row = ok(compare("cat\n", "cut\n", off)).rows[0];
    expect(row.leftSegs?.filter((s) => s.changed).map((s) => s.text)).toEqual([
      "a",
    ]);
    expect(row.rightSegs?.filter((s) => s.changed).map((s) => s.text)).toEqual([
      "u",
    ]);
  });

  it("treats CRLF and LF as the same", () => {
    expect(kinds(compare("a\r\nb\r\n", "a\nb\n", off))).toEqual([
      "equal",
      "equal",
    ]);
  });

  it("ignoreCase folds for matching but displays original text", () => {
    expect(kinds(compare("Hello\n", "hello\n", off))).toEqual(["changed"]);
    const r = ok(compare("Hello\n", "hello\n", { ...off, ignoreCase: true }));
    expect(r.rows).toMatchObject([{ kind: "equal", left: "Hello" }]);
  });

  it("ignoreWhitespace ignores spacing and a missing final newline", () => {
    const ws = { ...off, ignoreWhitespace: true };
    expect(kinds(compare("a  b\n", "a b\n", off))).toEqual(["changed"]);
    expect(kinds(compare("a  b\n", "a b\n", ws))).toEqual(["equal"]);
    expect(kinds(compare("a\nb", "a\nb\n", off))).toEqual(["equal", "changed"]);
    expect(kinds(compare("a\nb", "a\nb\n", ws))).toEqual(["equal", "equal"]);
  });

  it("skips the char diff on very long lines", () => {
    const long = "x".repeat(MAX_CHAR_DIFF_LINE + 1);
    const row = ok(compare(`${long}\n`, `${long}y\n`, off)).rows[0];
    expect(row.kind).toBe("changed");
    expect(row.leftSegs).toBeUndefined();
  });

  it("reports too-large when jsdiff times out", () => {
    const a = Array.from({ length: 4000 }, (_, i) => `a${i}`).join("\n");
    const b = Array.from({ length: 4000 }, (_, i) => `b${i}`).join("\n");
    expect(compare(a, b, off, 1)).toEqual({ tooLarge: true });
  });
});

describe("statusOf", () => {
  const res = (a: string, b: string) => compare(a, b, off);

  it("covers empty and waiting states", () => {
    expect(statusOf("", "", null).state).toBe("empty");
    expect(statusOf("", "x", null)).toMatchObject({
      state: "waiting",
      waitingFor: "original",
    });
    expect(statusOf("x", "", null)).toMatchObject({ waitingFor: "changed" });
  });

  it("covers identical and differing with a summed count", () => {
    expect(statusOf("a\n", "a\n", res("a\n", "a\n")).state).toBe("identical");
    const s = statusOf("a\nb\n", "A\n", res("a\nb\n", "A\n"));
    expect(s).toMatchObject({ state: "differing", count: 2 });
    expect(s.message).toBe("2 differing lines");
    expect(statusOf("a", "b", res("a", "b")).message).toBe("1 differing line");
  });

  it("maps a too-large result", () => {
    expect(statusOf("a", "b", { tooLarge: true }).state).toBe("too-large");
  });
});
