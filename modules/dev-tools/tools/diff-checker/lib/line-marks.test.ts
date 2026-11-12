import { expect, it } from "vitest";

import { MAX_CHAR_DIFF_LINE, compare } from "./compare";
import { lineMarks } from "./line-marks";

it("maps rows to per-line marks for each side", () => {
  const r = compare("a\nb\nc\n", "a\nB\nc\nd\n", {
    ignoreWhitespace: false,
    ignoreCase: false,
  });
  if (r.tooLarge) throw new Error("unexpected");
  const left = lineMarks(r.rows, "original");
  const right = lineMarks(r.rows, "changed");
  expect(left[0]).toBeUndefined();
  expect(left[1]).toMatchObject({ kind: "changed" });
  expect(left[1]?.segs?.some((s) => s.changed)).toBe(true);
  expect(left).toHaveLength(2);
  expect(right[3]).toMatchObject({ kind: "added" });
});

it("keeps the line mark but no char segments on very long lines", () => {
  const long = "x".repeat(MAX_CHAR_DIFF_LINE + 1);
  const r = compare(`${long}a\n`, `${long}b\n`, {
    ignoreWhitespace: false,
    ignoreCase: false,
  });
  if (r.tooLarge) throw new Error("unexpected");
  expect(lineMarks(r.rows, "original")[0]).toEqual({
    kind: "changed",
    segs: undefined,
  });
});

it("returns too-large quickly for pathological divergent input", () => {
  const a = Array.from({ length: 20000 }, (_, i) => `a${i}`).join("\n");
  const b = Array.from({ length: 20000 }, (_, i) => `b${i}`).join("\n");
  const start = Date.now();
  const r = compare(a, b, { ignoreWhitespace: false, ignoreCase: false }, 200);
  expect(Date.now() - start).toBeLessThan(2000);
  expect(r.tooLarge || r.rows.length > 0).toBe(true);
});
