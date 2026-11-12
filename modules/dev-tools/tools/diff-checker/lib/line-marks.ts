import type { Row, Seg } from "./compare";
import type { Side } from "./history";

/** What the highlight layer needs to know about one line of one box. */
export type LineMark = { kind: "removed" | "added" | "changed"; segs?: Seg[] };

/**
 * Per-line marks for one box, indexed by 0-based line. Equal lines (and lines
 * the diff does not know about) are undefined.
 */
export function lineMarks(rows: Row[], side: Side): (LineMark | undefined)[] {
  const marks: (LineMark | undefined)[] = [];
  for (const row of rows) {
    const no = side === "original" ? row.leftNo : row.rightNo;
    if (no === null || row.kind === "equal") continue;
    marks[no - 1] = {
      kind: row.kind,
      segs: side === "original" ? row.leftSegs : row.rightSegs,
    };
  }
  return marks;
}
