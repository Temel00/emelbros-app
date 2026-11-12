import { expect, it } from "vitest";

import { compare } from "./compare";
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
