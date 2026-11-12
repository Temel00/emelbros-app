import { diffChars, diffLines } from "diff";

export type Seg = { text: string; changed: boolean };
export type RowKind = "equal" | "added" | "removed" | "changed";
export type Row = {
  kind: RowKind;
  left: string | null;
  right: string | null;
  /** 1-based line numbers; null on the side a row does not exist. */
  leftNo: number | null;
  rightNo: number | null;
  /** Character segments, only on paired `changed` rows. */
  leftSegs?: Seg[];
  rightSegs?: Seg[];
};
export type CompareOptions = { ignoreWhitespace: boolean; ignoreCase: boolean };
export type Counts = { added: number; removed: number; changed: number };
export type CompareResult =
  ({ tooLarge: false; rows: Row[] } & Counts) | { tooLarge: true };

/** jsdiff abort budget; beyond it the result is "too large to compare". */
export const TIMEOUT_MS = 2000;
/** Paired lines longer than this skip the character diff. */
export const MAX_CHAR_DIFF_LINE = 2000;

const toLines = (text: string) => {
  const lines = text.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
};

export function compare(
  original: string,
  changed: string,
  options: CompareOptions,
  timeoutMs: number = TIMEOUT_MS,
): CompareResult {
  // CRLF and LF are always the same; the only silent normalisation.
  const a = original.replace(/\r\n/g, "\n");
  const b = changed.replace(/\r\n/g, "\n");
  const aLines = toLines(a);
  const bLines = toLines(b);
  // diffLines has no ignoreCase option, and its ignoreWhitespace only trims
  // line edges: fold both ourselves for the line pass. Display text always
  // comes from aLines/bLines. Folding from lines also drops a missing final
  // newline, which ignore-whitespace must ignore.
  const foldLine = (l: string) => {
    const v = options.ignoreWhitespace ? l.replace(/\s+/g, " ").trim() : l;
    return options.ignoreCase ? v.toLowerCase() : v;
  };
  const fold = (text: string, lines: string[]) =>
    options.ignoreWhitespace
      ? lines.length
        ? lines.map(foldLine).join("\n") + "\n"
        : ""
      : foldLine(text);
  const parts = diffLines(fold(a, aLines), fold(b, bLines), {
    timeout: timeoutMs,
  });
  if (!parts) return { tooLarge: true };

  const rows: Row[] = [];
  const counts: Counts = { added: 0, removed: 0, changed: 0 };
  let ai = 0;
  let bi = 0;
  let pendingRemoved = 0;
  let pendingAdded = 0;

  // Lines pair index-wise within a run of removed/added lines; leftovers are
  // plain removed or added.
  const flush = () => {
    const pairs = Math.min(pendingRemoved, pendingAdded);
    const startA = ai - pendingRemoved;
    const startB = bi - pendingAdded;
    for (let i = 0; i < Math.max(pendingRemoved, pendingAdded); i++) {
      const l = i < pendingRemoved ? aLines[startA + i] : null;
      const r = i < pendingAdded ? bLines[startB + i] : null;
      const leftNo = l === null ? null : startA + i + 1;
      const rightNo = r === null ? null : startB + i + 1;
      if (i < pairs && l !== null && r !== null) {
        counts.changed++;
        const row: Row = {
          kind: "changed",
          left: l,
          right: r,
          leftNo,
          rightNo,
        };
        if (l.length <= MAX_CHAR_DIFF_LINE && r.length <= MAX_CHAR_DIFF_LINE) {
          const chars = diffChars(l, r, {
            ignoreCase: options.ignoreCase,
            timeout: timeoutMs,
          });
          if (chars) {
            row.leftSegs = chars
              .filter((p) => !p.added)
              .map((p) => ({ text: p.value, changed: !!p.removed }));
            row.rightSegs = chars
              .filter((p) => !p.removed)
              .map((p) => ({ text: p.value, changed: !!p.added }));
          }
        }
        rows.push(row);
      } else if (l !== null) {
        counts.removed++;
        rows.push({ kind: "removed", left: l, right: null, leftNo, rightNo });
      } else {
        counts.added++;
        rows.push({ kind: "added", left: null, right: r, leftNo, rightNo });
      }
    }
    pendingRemoved = 0;
    pendingAdded = 0;
  };

  for (const part of parts) {
    const n = toLines(part.value).length;
    if (part.removed) {
      ai += n;
      pendingRemoved += n;
    } else if (part.added) {
      bi += n;
      pendingAdded += n;
    } else {
      flush();
      for (let i = 0; i < n; i++) {
        rows.push({
          kind: "equal",
          left: aLines[ai],
          right: bLines[bi],
          leftNo: ai + 1,
          rightNo: bi + 1,
        });
        ai++;
        bi++;
      }
    }
  }
  flush();
  return { tooLarge: false, rows, ...counts };
}
