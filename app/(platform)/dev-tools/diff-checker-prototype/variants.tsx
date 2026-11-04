"use client";

// PROTOTYPE (#239): four structurally different layouts over one shared diff model.
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import type { Row } from "./diff-model";
import {
  Actions,
  AlignedRow,
  areaClass,
  Cell,
  CopyButton,
  HighlightToggles,
  IgnoreToggles,
  StatusPill,
  Summary,
  type Ctl,
} from "./shared";

const wrap = "mx-auto flex w-full max-w-6xl flex-1 flex-col gap-3 p-4";

function Bar({ c, extra }: { c: Ctl; extra?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border-2 border-input p-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <StatusPill c={c} />
        <Summary c={c} />
        <div className="ml-auto">
          <Actions c={c} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
        <HighlightToggles c={c} />
        <IgnoreToggles c={c} />
        {extra}
      </div>
    </div>
  );
}

function PaneHeader({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-1 pb-1">
      <span className="text-xs font-semibold tracking-wide uppercase">
        {title}
      </span>
      <div className="flex items-center gap-2">
        {children}
        <CopyButton text={text} />
      </div>
    </div>
  );
}

/* ---------- A: one aligned scroll surface, click a side to edit it ---------- */
export function VariantA({ c }: { c: Ctl }) {
  const [editing, setEditing] = useState<"a" | "b" | null>(null);
  return (
    <div className={wrap}>
      <Bar c={c} />
      <div className="grid gap-1 sm:grid-cols-2 sm:gap-3">
        <PaneHeader title="Original" text={c.a}>
          <button
            className="text-xs underline"
            onClick={() => setEditing(editing === "a" ? null : "a")}
          >
            {editing === "a" ? "Done" : "Edit"}
          </button>
        </PaneHeader>
        <PaneHeader title="Changed" text={c.b}>
          <button
            className="text-xs underline"
            onClick={() => setEditing(editing === "b" ? null : "b")}
          >
            {editing === "b" ? "Done" : "Edit"}
          </button>
        </PaneHeader>
      </div>
      {editing && (
        <textarea
          aria-label={editing === "a" ? "Original text" : "Changed text"}
          className={cn(areaClass, "h-48")}
          value={editing === "a" ? c.a : c.b}
          onChange={(e) =>
            editing === "a" ? c.setA(e.target.value) : c.setB(e.target.value)
          }
        />
      )}
      <div className="overflow-auto rounded-lg border-2 border-input py-1">
        {c.diff.rows.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">
            Nothing to show yet. Use Edit on each side to paste text.
          </p>
        ) : (
          c.diff.rows.map((r, i) => <AlignedRow key={i} row={r} c={c} />)
        )}
      </div>
    </div>
  );
}

/* ---------- B: Edit tab / Compare tab ---------- */
export function VariantB({ c }: { c: Ctl }) {
  const [tab, setTab] = useState<"edit" | "compare">("edit");
  const tabCls = (on: boolean) =>
    cn(
      "h-9 flex-1 rounded-lg border-2 px-3 text-sm font-medium sm:flex-none",
      on ? "border-primary bg-primary/10" : "border-input hover:bg-muted",
    );
  return (
    <div className={wrap}>
      <div className="flex gap-2">
        <button
          className={tabCls(tab === "edit")}
          onClick={() => setTab("edit")}
        >
          Edit
        </button>
        <button
          className={tabCls(tab === "compare")}
          onClick={() => setTab("compare")}
        >
          Compare{" "}
          <span className="font-mono text-xs text-muted-foreground">
            {c.diff.added + c.diff.removed + c.diff.changed || ""}
          </span>
        </button>
      </div>
      <Bar c={c} />
      {tab === "edit" ? (
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          {(["a", "b"] as const).map((k) => (
            <div key={k} className="flex flex-col">
              <PaneHeader
                title={k === "a" ? "Original" : "Changed"}
                text={k === "a" ? c.a : c.b}
              />
              <textarea
                aria-label={k === "a" ? "Original text" : "Changed text"}
                placeholder="Paste or type text"
                className={cn(areaClass, "min-h-72 flex-1")}
                value={k === "a" ? c.a : c.b}
                onChange={(e) =>
                  k === "a" ? c.setA(e.target.value) : c.setB(e.target.value)
                }
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border-2 border-input py-1">
          {c.diff.rows.map((r, i) => (
            <AlignedRow key={i} row={r} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- C: inputs on top, collapsed-context result + minimap ---------- */
const CTX = 1;
type Item = { type: "row"; row: Row; i: number } | { type: "gap"; n: number };

function collapse(rows: Row[]): Item[] {
  const keep = rows.map((r, i) => {
    if (r.kind !== "equal") return true;
    for (let d = -CTX; d <= CTX; d++)
      if (rows[i + d] && rows[i + d].kind !== "equal") return true;
    return false;
  });
  const out: Item[] = [];
  let gap = 0;
  rows.forEach((row, i) => {
    if (keep[i]) {
      if (gap) out.push({ type: "gap", n: gap });
      gap = 0;
      out.push({ type: "row", row, i });
    } else gap++;
  });
  if (gap) out.push({ type: "gap", n: gap });
  return out;
}

export function VariantC({ c }: { c: Ctl }) {
  const [full, setFull] = useState(false);
  const items = useMemo<Item[]>(
    () =>
      full
        ? c.diff.rows.map((row, i) => ({ type: "row", row, i }))
        : collapse(c.diff.rows),
    [c.diff.rows, full],
  );
  const total = c.diff.rows.length || 1;
  return (
    <div className={wrap}>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["a", "b"] as const).map((k) => (
          <div key={k}>
            <PaneHeader
              title={k === "a" ? "Original" : "Changed"}
              text={k === "a" ? c.a : c.b}
            />
            <textarea
              aria-label={k === "a" ? "Original text" : "Changed text"}
              placeholder="Paste or type text"
              className={cn(areaClass, "h-32")}
              value={k === "a" ? c.a : c.b}
              onChange={(e) =>
                k === "a" ? c.setA(e.target.value) : c.setB(e.target.value)
              }
            />
          </div>
        ))}
      </div>
      <Bar
        c={c}
        extra={
          <label className="inline-flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              className="size-4 accent-[var(--primary)]"
              checked={full}
              onChange={(e) => setFull(e.target.checked)}
            />
            Show unchanged lines
          </label>
        }
      />
      <div className="flex gap-2">
        <div className="min-w-0 flex-1 overflow-auto rounded-lg border-2 border-input py-1">
          {items.map((it, k) =>
            it.type === "gap" ? (
              <div
                key={k}
                className="bg-muted px-3 py-0.5 text-center text-xs text-muted-foreground"
              >
                ⋯ {it.n} unchanged line{it.n === 1 ? "" : "s"}
              </div>
            ) : (
              <AlignedRow key={k} row={it.row} c={c} />
            ),
          )}
        </div>
        <div
          aria-hidden
          className="relative hidden w-3 shrink-0 rounded bg-muted sm:block"
        >
          {c.diff.rows.map((r, i) =>
            r.kind === "equal" ? null : (
              <span
                key={i}
                className={cn(
                  "absolute inset-x-0 h-0.5",
                  r.kind === "added"
                    ? "bg-emerald-500"
                    : r.kind === "removed"
                      ? "bg-destructive"
                      : "bg-amber-500",
                )}
                style={{ top: `${(i / total) * 100}%` }}
              />
            ),
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- D: change list — one card per difference ---------- */
type Hunk = { rows: Row[]; start: number };

function hunks(rows: Row[]): Hunk[] {
  const out: Hunk[] = [];
  let cur: Hunk | null = null;
  rows.forEach((r, i) => {
    if (r.kind === "equal") {
      cur = null;
      return;
    }
    if (!cur) {
      cur = { rows: [], start: i };
      out.push(cur);
    }
    cur.rows.push(r);
  });
  return out;
}

export function VariantD({ c }: { c: Ctl }) {
  const [open, setOpen] = useState(false);
  const list = useMemo(() => hunks(c.diff.rows), [c.diff.rows]);
  return (
    <div className={wrap}>
      <Bar
        c={c}
        extra={
          <button className="text-xs underline" onClick={() => setOpen(!open)}>
            {open ? "Hide inputs" : "Show inputs"}
          </button>
        }
      />
      {open && (
        <div className="grid gap-3 sm:grid-cols-2">
          {(["a", "b"] as const).map((k) => (
            <div key={k}>
              <PaneHeader
                title={k === "a" ? "Original" : "Changed"}
                text={k === "a" ? c.a : c.b}
              />
              <textarea
                aria-label={k === "a" ? "Original text" : "Changed text"}
                className={cn(areaClass, "h-40")}
                value={k === "a" ? c.a : c.b}
                onChange={(e) =>
                  k === "a" ? c.setA(e.target.value) : c.setB(e.target.value)
                }
              />
            </div>
          ))}
        </div>
      )}
      {list.length === 0 && (
        <p className="rounded-lg border-2 border-input p-3 text-sm text-muted-foreground">
          {c.status.message}
        </p>
      )}
      {list.map((h, n) => {
        const first = h.rows[0];
        const lineNo = first.leftNo ?? first.rightNo;
        return (
          <section
            key={h.start}
            className="overflow-hidden rounded-lg border-2 border-input"
          >
            <h3 className="flex items-center justify-between bg-muted px-3 py-1 text-xs font-semibold">
              <span>
                Change {n + 1} of {list.length}
              </span>
              <span className="font-mono font-normal text-muted-foreground">
                line {lineNo}
              </span>
            </h3>
            <div className="py-1">
              {h.rows.map((r, i) => (
                <div
                  key={i}
                  className="grid gap-px sm:grid-cols-2 sm:divide-x sm:divide-border"
                >
                  <Cell row={r} side="l" c={c} showNo={false} />
                  <Cell row={r} side="r" c={c} showNo={false} />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
