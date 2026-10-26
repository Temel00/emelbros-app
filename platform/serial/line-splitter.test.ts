import { describe, expect, it } from "vitest";

import { splitLines } from "@/platform/serial/line-splitter";

/** Feed chunks through the splitter the way the read loop does. */
function feed(chunks: string[]) {
  let pending = "";
  const lines: string[] = [];
  for (const chunk of chunks) {
    const result = splitLines(pending, chunk);
    pending = result.pending;
    lines.push(...result.lines);
  }
  return { lines, pending };
}

describe("splitLines", () => {
  it("returns whole lines and nothing pending", () => {
    expect(feed(["OK\nDONE\n"])).toEqual({
      lines: ["OK", "DONE"],
      pending: "",
    });
  });

  it("joins a line fragmented mid-word across chunks", () => {
    expect(feed(["OK MO", "VE 1", "2.50\n"])).toEqual({
      lines: ["OK MOVE 12.50"],
      pending: "",
    });
  });

  it("handles \\r\\n split across two chunks", () => {
    expect(feed(["OK\r", "\nDONE\r\n"])).toEqual({
      lines: ["OK", "DONE"],
      pending: "",
    });
  });

  it("splits on bare \\r and bare \\n", () => {
    expect(feed(["A\rB\nC\n"]).lines).toEqual(["A", "B", "C"]);
  });

  it("drops empty lines", () => {
    expect(feed(["\n\r\nA\n\n\nB\n"]).lines).toEqual(["A", "B"]);
  });

  it("keeps a partial last line pending until it ends", () => {
    const first = feed(["OK\nDONE IDL"]);
    expect(first).toEqual({ lines: ["OK"], pending: "DONE IDL" });
    expect(splitLines(first.pending, "E\n")).toEqual({
      lines: ["DONE IDLE"],
      pending: "",
    });
  });
});
