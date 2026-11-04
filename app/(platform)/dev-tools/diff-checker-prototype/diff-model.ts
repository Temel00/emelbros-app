// PROTOTYPE (#239): throwaway diff model on jsdiff. Aligned rows + char segments.
import { diffChars, diffLines } from "diff";

// Lives here (not in prototype.tsx) so the server page can read it.
export const VARIANTS = ["A", "B", "C", "D"] as const;
export type VariantId = (typeof VARIANTS)[number];

export type Seg = { text: string; changed: boolean };
export type RowKind = "equal" | "added" | "removed" | "changed";
export type Row = {
  kind: RowKind;
  left: string | null;
  right: string | null;
  leftNo: number | null;
  rightNo: number | null;
  leftSegs?: Seg[];
  rightSegs?: Seg[];
};
export type DiffOptions = { ignoreWhitespace: boolean; ignoreCase: boolean };
export type Diff = {
  rows: Row[];
  added: number;
  removed: number;
  changed: number;
};

const toLines = (v: string) => {
  const l = v.split("\n");
  if (l[l.length - 1] === "") l.pop();
  return l;
};

export function computeDiff(a: string, b: string, opts: DiffOptions): Diff {
  // CRLF is normalised here; whether that's right is an open question.
  const A = a.replace(/\r\n/g, "\n");
  const B = b.replace(/\r\n/g, "\n");
  const aLines = toLines(A);
  const bLines = toLines(B);
  // diffLines has no ignoreCase option (diffChars does): fold case ourselves.
  // Display text still comes from aLines/bLines, so original casing is shown.
  const fold = (v: string) => (opts.ignoreCase ? v.toLowerCase() : v);
  const changes = diffLines(fold(A), fold(B), {
    ignoreWhitespace: opts.ignoreWhitespace,
  });

  const rows: Row[] = [];
  let ai = 0;
  let bi = 0;
  let pendingRemoved = 0;
  let pendingAdded = 0;
  let added = 0;
  let removed = 0;
  let changed = 0;

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
        const parts = diffChars(l, r, { ignoreCase: opts.ignoreCase });
        rows.push({
          kind: "changed",
          left: l,
          right: r,
          leftNo,
          rightNo,
          leftSegs: parts
            .filter((p) => !p.added)
            .map((p) => ({ text: p.value, changed: !!p.removed })),
          rightSegs: parts
            .filter((p) => !p.removed)
            .map((p) => ({ text: p.value, changed: !!p.added })),
        });
        changed++;
      } else if (l !== null) {
        rows.push({ kind: "removed", left: l, right: null, leftNo, rightNo });
        removed++;
      } else {
        rows.push({ kind: "added", left: null, right: r, leftNo, rightNo });
        added++;
      }
    }
    pendingRemoved = 0;
    pendingAdded = 0;
  };

  for (const c of changes) {
    const n = toLines(c.value).length;
    if (c.removed) {
      ai += n;
      pendingRemoved += n;
    } else if (c.added) {
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
  return { rows, added, removed, changed };
}

export type Status = {
  state: "empty" | "waiting" | "identical" | "diff";
  message: string;
};

export function statusOf(a: string, b: string, diff: Diff): Status {
  if (!a && !b)
    return { state: "empty", message: "Paste text into both sides to compare" };
  if (!a) return { state: "waiting", message: "Waiting for Original text…" };
  if (!b) return { state: "waiting", message: "Waiting for Changed text…" };
  const n = diff.added + diff.removed + diff.changed;
  if (n === 0)
    return { state: "identical", message: "Identical — no differences" };
  return { state: "diff", message: `${n} differing line${n === 1 ? "" : "s"}` };
}

export const SAMPLE_A = `{
  "name": "emelbros-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "next": "16.2.10",
    "react": "19.2.4",
    "lucide-react": "^1.24.0"
  }
}
`;
export const SAMPLE_B = `{
  "name": "emelbros-app",
  "version": "0.2.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "16.2.11",
    "react": "19.2.4",
    "dompurify": "^3.4.16",
    "lucide-react": "^1.24.0"
  }
}
`;
