"use client";

import { Check, Copy, Eraser } from "lucide-react";
import { useEffect, useRef, useState, type MutableRefObject } from "react";

import { cn } from "@/lib/utils";

import { IconButton } from "./icon-button";
import type { LineMark, Seg, Side } from "./lib";

// Backdrop and textarea MUST share these metrics (ADR-0024).
const METRICS = "p-2 font-mono text-[13px] leading-5";

// Line cue = tint + inset bar; char cue = tint + underline, so colour is
// never the only signal.
const LINE: Record<Side, string> = {
  original: "bg-destructive/12 shadow-[inset_3px_0_0_0_var(--destructive)]",
  changed:
    "bg-emerald-500/15 shadow-[inset_3px_0_0_0_var(--color-emerald-600)]",
};
const CHAR: Record<Side, string> = {
  original:
    "bg-destructive/30 underline decoration-destructive decoration-2 underline-offset-2",
  changed:
    "bg-emerald-500/35 underline decoration-emerald-600 decoration-2 underline-offset-2",
};

function Segments({
  text,
  segs,
  whole,
  side,
}: {
  text: string;
  segs?: Seg[];
  whole: boolean;
  side: Side;
}) {
  if (whole) return <span className={CHAR[side]}>{text}</span>;
  if (!segs) return <>{text}</>;
  return (
    <>
      {segs.map((s, i) =>
        s.changed ? (
          <span key={i} className={CHAR[side]}>
            {s.text}
          </span>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}

export function HighlightEditor({
  side,
  label,
  value,
  onChange,
  marks,
  lineHighlight,
  charHighlight,
  onScrollTop,
  followRef,
}: {
  side: Side;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Undefined while the debounced diff is stale: no highlights are drawn. */
  marks: (LineMark | undefined)[] | undefined;
  lineHighlight: boolean;
  charHighlight: boolean;
  /** Called when the user scrolls this box, so the other can follow. */
  onScrollTop: (top: number) => void;
  /** This box registers its own "follow scrollTop" function here. */
  followRef: MutableRefObject<((top: number) => void) | null>;
}) {
  const backdrop = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    followRef.current = (top) => {
      if (area.current && area.current.scrollTop !== top)
        area.current.scrollTop = top;
    };
    return () => {
      followRef.current = null;
    };
  }, [followRef]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1200);
  };

  const lines = value.split("\n");

  return (
    <div className="relative rounded-lg border-2 border-input focus-within:border-ring">
      <div
        ref={backdrop}
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 overflow-hidden text-transparent",
          METRICS,
        )}
      >
        <div className="min-w-max">
          {lines.map((line, i) => {
            const mark = marks?.[i];
            return (
              <div
                key={i}
                className={cn(
                  "h-5 whitespace-pre",
                  mark && lineHighlight && LINE[side],
                )}
              >
                {mark && charHighlight ? (
                  <Segments
                    text={line}
                    segs={mark.segs}
                    whole={mark.kind !== "changed"}
                    side={side}
                  />
                ) : (
                  line
                )}
                {line === "" && "​"}
              </div>
            );
          })}
        </div>
      </div>
      <textarea
        ref={area}
        aria-label={label}
        wrap="off"
        spellCheck={false}
        placeholder="Paste or type text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (backdrop.current) {
            backdrop.current.scrollTop = el.scrollTop;
            backdrop.current.scrollLeft = el.scrollLeft;
          }
          onScrollTop(el.scrollTop);
        }}
        className={cn(
          "relative block h-[40vh] min-h-56 w-full resize-none overflow-auto bg-transparent whitespace-pre outline-none sm:h-[60vh]",
          METRICS,
        )}
      />
      <div className="absolute top-2 right-4 z-10 flex gap-1">
        <IconButton
          label={copied ? "Copied" : "Copy"}
          disabled={!value}
          onClick={() => void copy()}
        >
          {copied ? (
            <Check className="size-4" aria-hidden />
          ) : (
            <Copy className="size-4" aria-hidden />
          )}
        </IconButton>
        <IconButton
          label="Clear"
          disabled={!value}
          onClick={() => onChange("")}
        >
          <Eraser className="size-4" aria-hidden />
        </IconButton>
      </div>
    </div>
  );
}
