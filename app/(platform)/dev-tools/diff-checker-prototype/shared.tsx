"use client";

// PROTOTYPE (#239): shared bits only (state, toolbar parts, row cell). Layout is per-variant.
import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Check, Copy, Eraser } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  computeDiff,
  SAMPLE_A,
  SAMPLE_B,
  statusOf,
  type Diff,
  type Row,
  type Seg,
  type Status,
} from "./diff-model";

export type Ctl = {
  a: string;
  b: string;
  setA: (v: string) => void;
  setB: (v: string) => void;
  swap: () => void;
  clear: () => void;
  sample: () => void;
  lineHl: boolean;
  setLineHl: (v: boolean) => void;
  charHl: boolean;
  setCharHl: (v: boolean) => void;
  ignoreWs: boolean;
  setIgnoreWs: (v: boolean) => void;
  ignoreCase: boolean;
  setIgnoreCase: (v: boolean) => void;
  diff: Diff;
  status: Status;
  computing: boolean;
};

export function useDiffCtl(): Ctl {
  const [a, setA] = useState(SAMPLE_A);
  const [b, setB] = useState(SAMPLE_B);
  const [lineHl, setLineHl] = useState(true);
  const [charHl, setCharHl] = useState(true);
  const [ignoreWs, setIgnoreWs] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [deb, setDeb] = useState({ a, b, ignoreWs, ignoreCase });
  const computing =
    deb.a !== a ||
    deb.b !== b ||
    deb.ignoreWs !== ignoreWs ||
    deb.ignoreCase !== ignoreCase;

  useEffect(() => {
    const t = setTimeout(() => setDeb({ a, b, ignoreWs, ignoreCase }), 250);
    return () => clearTimeout(t);
  }, [a, b, ignoreWs, ignoreCase]);

  const diff = useMemo(
    () =>
      computeDiff(deb.a, deb.b, {
        ignoreWhitespace: deb.ignoreWs,
        ignoreCase: deb.ignoreCase,
      }),
    [deb],
  );
  const status = statusOf(deb.a, deb.b, diff);

  return {
    a,
    b,
    setA,
    setB,
    swap: () => {
      setA(b);
      setB(a);
    },
    clear: () => {
      setA("");
      setB("");
    },
    sample: () => {
      setA(SAMPLE_A);
      setB(SAMPLE_B);
    },
    lineHl,
    setLineHl,
    charHl,
    setCharHl,
    ignoreWs,
    setIgnoreWs,
    ignoreCase,
    setIgnoreCase,
    diff,
    status,
    computing,
  };
}

const btn =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border-2 border-input bg-background px-2.5 text-xs font-medium hover:bg-muted disabled:opacity-50";

export function Check2({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[var(--primary)]"
      />
      {label}
    </label>
  );
}

export function HighlightToggles({ c }: { c: Ctl }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <Check2
        label="Line highlight"
        checked={c.lineHl}
        onChange={c.setLineHl}
      />
      <Check2
        label="Character highlight"
        checked={c.charHl}
        onChange={c.setCharHl}
      />
    </div>
  );
}

export function IgnoreToggles({ c }: { c: Ctl }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <Check2
        label="Ignore whitespace"
        checked={c.ignoreWs}
        onChange={c.setIgnoreWs}
      />
      <Check2
        label="Ignore case"
        checked={c.ignoreCase}
        onChange={c.setIgnoreCase}
      />
    </div>
  );
}

export function Actions({ c }: { c: Ctl }) {
  return (
    <div className="flex items-center gap-2">
      <button className={btn} onClick={c.swap}>
        <ArrowLeftRight className="size-3.5" aria-hidden /> Swap
      </button>
      <button className={btn} onClick={c.clear}>
        <Eraser className="size-3.5" aria-hidden /> Clear
      </button>
      <button className={btn} onClick={c.sample}>
        Sample
      </button>
    </div>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className={btn}
      disabled={!text}
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
    >
      {done ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      {done ? "Copied" : "Copy"}
    </button>
  );
}

export function StatusPill({ c }: { c: Ctl }) {
  const tone =
    c.status.state === "identical"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : c.status.state === "diff"
        ? "bg-destructive/15 text-foreground"
        : "bg-muted text-muted-foreground";
  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        tone,
      )}
    >
      {c.computing ? "Comparing…" : c.status.message}
    </span>
  );
}

export function Summary({ c }: { c: Ctl }) {
  if (c.status.state !== "diff" && c.status.state !== "identical") return null;
  const { added, removed, changed } = c.diff;
  return (
    <span className="font-mono text-xs text-muted-foreground">
      <span className="text-emerald-700 dark:text-emerald-300">+{added}</span>{" "}
      <span className="text-destructive">−{removed}</span>{" "}
      <span className="text-foreground">~{changed}</span>
    </span>
  );
}

// ---- row rendering (used by aligned views) ----

const LINE_L = "bg-destructive/12";
const LINE_R = "bg-emerald-500/15";
const CHAR_L = "bg-destructive/30";
const CHAR_R = "bg-emerald-500/35";

export function Segs({
  text,
  segs,
  charHl,
  side,
  wholeLine,
}: {
  text: string;
  segs?: Seg[];
  charHl: boolean;
  side: "l" | "r";
  wholeLine: boolean;
}) {
  const cls = side === "l" ? CHAR_L : CHAR_R;
  if (!charHl) return <>{text || "​"}</>;
  if (wholeLine) return <span className={cls}>{text || "​"}</span>;
  if (!segs) return <>{text || "​"}</>;
  return (
    <>
      {segs.map((s, i) =>
        s.changed ? (
          <span key={i} className={cls}>
            {s.text}
          </span>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}

export function Cell({
  row,
  side,
  c,
  showNo = true,
}: {
  row: Row;
  side: "l" | "r";
  c: Ctl;
  showNo?: boolean;
}) {
  const text = side === "l" ? row.left : row.right;
  const no = side === "l" ? row.leftNo : row.rightNo;
  const segs = side === "l" ? row.leftSegs : row.rightSegs;
  const differs = row.kind !== "equal";
  if (text === null)
    return (
      <div
        aria-hidden
        className="hidden min-h-5 bg-[repeating-linear-gradient(135deg,transparent_0_4px,var(--muted)_4px_5px)] sm:block"
      />
    );
  const marker = !differs ? " " : side === "l" ? "−" : "+";
  return (
    <div
      className={cn(
        "flex min-h-5 min-w-0 font-mono text-[13px] leading-5",
        differs && c.lineHl && (side === "l" ? LINE_L : LINE_R),
      )}
    >
      {showNo && (
        <span className="w-9 shrink-0 pr-2 text-right text-muted-foreground/70 select-none">
          {no}
        </span>
      )}
      <span
        aria-hidden
        className={cn(
          "w-4 shrink-0 text-center select-none",
          side === "l"
            ? "text-destructive"
            : "text-emerald-700 dark:text-emerald-300",
        )}
      >
        {marker}
      </span>
      <span className="min-w-0 flex-1 break-all whitespace-pre-wrap">
        <Segs
          text={text}
          segs={segs}
          charHl={differs && c.charHl}
          side={side}
          wholeLine={row.kind === "added" || row.kind === "removed"}
        />
      </span>
    </div>
  );
}

export function AlignedRow({ row, c }: { row: Row; c: Ctl }) {
  return (
    <div className="sm:grid sm:grid-cols-2 sm:divide-x sm:divide-border">
      <Cell row={row} side="l" c={c} />
      <Cell row={row} side="r" c={c} />
    </div>
  );
}

export const areaClass =
  "w-full resize-none rounded-lg border-2 border-input bg-background p-2 font-mono text-[13px] leading-5 outline-none focus-visible:border-ring";
