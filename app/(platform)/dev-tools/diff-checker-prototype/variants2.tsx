"use client";

// PROTOTYPE (#241): round 2. Edit and compare in one surface (highlights render
// behind the text box while typing) plus a collapsible left options panel.
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  CaseSensitive,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eraser,
  Highlighter,
  SlidersHorizontal,
  Space,
  Type,
} from "lucide-react";

import { cn } from "@/lib/utils";

import type { Row } from "./diff-model";
import { Check2, Segs, StatusPill, Summary, type Ctl } from "./shared";

const iconBtn =
  "inline-flex size-8 items-center justify-center rounded-lg border-2 border-input bg-background text-foreground hover:bg-muted disabled:opacity-40";

function Tip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute -top-8 left-1/2 z-30 hidden -translate-x-1/2 rounded bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background group-focus-within:block group-hover:block"
      >
        {label}
      </span>
    </span>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <Tip label={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        disabled={disabled}
        onClick={onClick}
        className={cn(iconBtn, pressed && "border-primary bg-primary/10")}
      >
        {children}
      </button>
    </Tip>
  );
}

function CopyIcon({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <IconButton
      label={done ? "Copied" : "Copy"}
      disabled={!text}
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
    >
      {done ? (
        <Check className="size-4" aria-hidden />
      ) : (
        <Copy className="size-4" aria-hidden />
      )}
    </IconButton>
  );
}

/* ---- the in-place highlighted editor ---- */

function rowsBySide(rows: Row[], side: "l" | "r") {
  const m = new Map<number, Row>();
  for (const r of rows) {
    const n = side === "l" ? r.leftNo : r.rightNo;
    if (n !== null) m.set(n - 1, r);
  }
  return m;
}

function Editor({ idx, c, label }: { idx: 0 | 1; c: Ctl; label: string }) {
  const side = idx === 0 ? "l" : "r";
  const text = idx === 0 ? c.a : c.b;
  const set = idx === 0 ? c.setA : c.setB;
  const info = useMemo(
    () => rowsBySide(c.diff.rows, side),
    [c.diff.rows, side],
  );
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  const onScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const me = e.currentTarget;
    const bd = me.previousElementSibling as HTMLElement | null;
    if (bd) {
      bd.scrollTop = me.scrollTop;
      bd.scrollLeft = me.scrollLeft;
    }
    // Scroll together: the other box follows (its own scroll event syncs its backdrop).
    me.closest("[data-editors]")
      ?.querySelectorAll("textarea")
      .forEach((o) => {
        if (o !== me && o.scrollTop !== me.scrollTop)
          o.scrollTop = me.scrollTop;
      });
  };

  return (
    <div className="relative rounded-lg border-2 border-input focus-within:border-ring">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden p-2 font-mono text-[13px] leading-5 text-transparent"
      >
        {lines.map((ln, i) => {
          const row = !c.computing ? info.get(i) : undefined;
          const differs = !!row && row.kind !== "equal";
          return (
            <div
              key={i}
              className={cn(
                "h-5 whitespace-pre",
                differs &&
                  c.lineHl &&
                  (side === "l" ? "bg-destructive/12" : "bg-emerald-500/15"),
              )}
            >
              {differs && row ? (
                <Segs
                  text={ln}
                  segs={side === "l" ? row.leftSegs : row.rightSegs}
                  charHl={c.charHl}
                  side={side}
                  wholeLine={row.kind === "added" || row.kind === "removed"}
                />
              ) : (
                ln || "​"
              )}
            </div>
          );
        })}
      </div>
      <textarea
        aria-label={label}
        wrap="off"
        spellCheck={false}
        placeholder="Paste or type text"
        value={text}
        onChange={(e) => set(e.target.value)}
        onScroll={onScroll}
        className="relative block h-[60vh] min-h-72 w-full resize-none overflow-auto bg-transparent p-2 font-mono text-[13px] leading-5 whitespace-pre outline-none"
      />
      <div className="absolute top-2 right-4 z-10 flex gap-1">
        <CopyIcon text={text} />
        <IconButton label="Clear" disabled={!text} onClick={() => set("")}>
          <Eraser className="size-4" aria-hidden />
        </IconButton>
      </div>
    </div>
  );
}

function Editors({ c }: { c: Ctl }) {
  const title = "text-xs font-semibold tracking-wide uppercase";
  return (
    <div
      data-editors
      className="grid min-w-0 flex-1 grid-cols-1 content-start gap-x-3 gap-y-1 sm:grid-cols-2"
    >
      <h2 className={cn(title, "sm:col-start-1 sm:row-start-1")}>Original</h2>
      <Editor idx={0} c={c} label="Original text" />
      <div className="flex justify-center py-1 sm:z-10 sm:col-span-2 sm:col-start-1 sm:row-start-1 sm:py-0">
        <IconButton label="Swap" onClick={c.swap}>
          <ArrowLeftRight className="size-4" aria-hidden />
        </IconButton>
      </div>
      <h2 className={cn(title, "sm:col-start-2 sm:row-start-1 sm:text-right")}>
        Changed
      </h2>
      <Editor idx={1} c={c} label="Changed text" />
    </div>
  );
}

function StatusRow({ c }: { c: Ctl }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <StatusPill c={c} />
      <Summary c={c} />
    </div>
  );
}

function OptionsList({ c }: { c: Ctl }) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Highlight
        </legend>
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
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Ignore
        </legend>
        <Check2
          label="Whitespace"
          checked={c.ignoreWs}
          onChange={c.setIgnoreWs}
        />
        <Check2
          label="Case"
          checked={c.ignoreCase}
          onChange={c.setIgnoreCase}
        />
      </fieldset>
    </div>
  );
}

const wrap = "mx-auto flex w-full max-w-7xl flex-1 flex-col gap-3 p-4";

/* ---------- E: left panel, expanded by default, collapses fully ---------- */
export function VariantE({ c }: { c: Ctl }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={wrap}>
      <div className="flex flex-wrap items-center gap-3">
        <IconButton
          label={open ? "Hide options" : "Show options"}
          pressed={open}
          onClick={() => setOpen(!open)}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
        </IconButton>
        <StatusRow c={c} />
      </div>
      <div className="flex flex-1 flex-col gap-3 sm:flex-row">
        {open && (
          <aside className="w-full shrink-0 rounded-lg border-2 border-input p-3 sm:w-52">
            <OptionsList c={c} />
          </aside>
        )}
        <Editors c={c} />
      </div>
    </div>
  );
}

/* ---------- F: left panel collapses to an icon rail ---------- */
export function VariantF({ c }: { c: Ctl }) {
  const [open, setOpen] = useState(true);
  const rail: {
    label: string;
    on: boolean;
    set: (v: boolean) => void;
    icon: ReactNode;
  }[] = [
    {
      label: "Line highlight",
      on: c.lineHl,
      set: c.setLineHl,
      icon: <Highlighter className="size-4" aria-hidden />,
    },
    {
      label: "Character highlight",
      on: c.charHl,
      set: c.setCharHl,
      icon: <Type className="size-4" aria-hidden />,
    },
    {
      label: "Ignore whitespace",
      on: c.ignoreWs,
      set: c.setIgnoreWs,
      icon: <Space className="size-4" aria-hidden />,
    },
    {
      label: "Ignore case",
      on: c.ignoreCase,
      set: c.setIgnoreCase,
      icon: <CaseSensitive className="size-4" aria-hidden />,
    },
  ];
  return (
    <div className={wrap}>
      <StatusRow c={c} />
      <div className="flex flex-1 flex-col gap-3 sm:flex-row">
        <aside
          className={cn(
            "flex shrink-0 gap-2 rounded-lg border-2 border-input p-2 sm:flex-col",
            open ? "sm:w-52" : "sm:w-auto sm:items-center",
          )}
        >
          <IconButton
            label={open ? "Collapse options" : "Expand options"}
            onClick={() => setOpen(!open)}
          >
            {open ? (
              <ChevronLeft className="size-4" aria-hidden />
            ) : (
              <ChevronRight className="size-4" aria-hidden />
            )}
          </IconButton>
          {open ? (
            <div className="px-1 sm:pt-1">
              <OptionsList c={c} />
            </div>
          ) : (
            rail.map((r) => (
              <IconButton
                key={r.label}
                label={r.label}
                pressed={r.on}
                onClick={() => r.set(!r.on)}
              >
                {r.icon}
              </IconButton>
            ))
          )}
        </aside>
        <Editors c={c} />
      </div>
    </div>
  );
}

/* ---------- G: options as an overlay drawer, editors get the full width ---------- */
export function VariantG({ c }: { c: Ctl }) {
  const [open, setOpen] = useState(false);
  const active = [c.ignoreWs, c.ignoreCase].filter(Boolean).length;
  return (
    <div className={cn(wrap, "relative")}>
      <div className="flex flex-wrap items-center gap-3">
        <IconButton
          label="Options"
          pressed={open}
          onClick={() => setOpen(!open)}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
        </IconButton>
        {active > 0 && (
          <span className="text-xs text-muted-foreground">
            {active} ignore option{active === 1 ? "" : "s"} on
          </span>
        )}
        <StatusRow c={c} />
      </div>
      {open && (
        <aside className="absolute top-14 left-4 z-20 w-64 rounded-lg border-2 border-input bg-background p-3 shadow-lg">
          <OptionsList c={c} />
        </aside>
      )}
      <Editors c={c} />
    </div>
  );
}
