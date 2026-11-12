"use client";

import { ArrowLeftRight, SlidersHorizontal } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { HighlightEditor } from "./highlight-editor";
import { IconButton } from "./icon-button";
import {
  compare,
  lineMarks,
  statusOf,
  type CompareResult,
  type Snapshot,
} from "./lib";
import { ignoreCount, OptionsDrawer, type DiffOptions } from "./options-drawer";

const DEBOUNCE_MS = 250;
const TITLE = "text-xs font-semibold tracking-wide uppercase";

export default function DiffChecker() {
  const drawerId = useId();
  const [text, setText] = useState<Snapshot>({ original: "", changed: "" });
  const [options, setOptions] = useState<DiffOptions>({
    lineHighlight: true,
    charHighlight: true,
    ignoreWhitespace: false,
    ignoreCase: false,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [debounced, setDebounced] = useState(text);
  const followOriginal = useRef<((top: number) => void) | null>(null);
  const followChanged = useRef<((top: number) => void) | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [text]);

  // Highlights only when the debounced diff matches what is on screen.
  const current =
    debounced.original === text.original && debounced.changed === text.changed;
  const result: CompareResult | null = useMemo(
    () =>
      debounced.original && debounced.changed
        ? compare(debounced.original, debounced.changed, {
            ignoreWhitespace: options.ignoreWhitespace,
            ignoreCase: options.ignoreCase,
          })
        : null,
    [debounced, options.ignoreWhitespace, options.ignoreCase],
  );
  const rows = result && !result.tooLarge ? result.rows : null;
  const originalMarks = useMemo(
    () => (current && rows ? lineMarks(rows, "original") : undefined),
    [current, rows],
  );
  const changedMarks = useMemo(
    () => (current && rows ? lineMarks(rows, "changed") : undefined),
    [current, rows],
  );

  const status = statusOf(debounced.original, debounced.changed, result);
  const comparing = !current && !!text.original && !!text.changed;
  const message = comparing ? "Comparing…" : status.message;
  const ignores = ignoreCount(options);
  const summary =
    !comparing && result && !result.tooLarge
      ? `+${result.added} −${result.removed} ~${result.changed}`
      : null;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <IconButton
          label={drawerOpen ? "Hide options" : "Show options"}
          pressed={drawerOpen}
          onClick={() => setDrawerOpen((o) => !o)}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
        </IconButton>
        {!drawerOpen && ignores > 0 && (
          <span className="text-xs text-muted-foreground">
            {ignores} ignore option{ignores === 1 ? "" : "s"} on
          </span>
        )}
        <span role="status" aria-live="polite" className="text-sm">
          {message}
        </span>
        {summary && (
          <span className="font-mono text-sm text-muted-foreground">
            {summary}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
        {drawerOpen && (
          <OptionsDrawer
            id={drawerId}
            options={options}
            onChange={setOptions}
          />
        )}
        <div className="grid min-w-0 flex-1 grid-cols-1 content-start gap-x-3 gap-y-1 sm:grid-cols-2">
          <h2 className={cn(TITLE, "sm:col-start-1 sm:row-start-1")}>
            Original
          </h2>
          <HighlightEditor
            side="original"
            label="Original text"
            value={text.original}
            onChange={(original) => setText((t) => ({ ...t, original }))}
            marks={originalMarks}
            lineHighlight={options.lineHighlight}
            charHighlight={options.charHighlight}
            onScrollTop={(top) => followChanged.current?.(top)}
            followRef={followOriginal}
          />
          <div className="flex justify-center py-1 sm:z-10 sm:col-span-2 sm:col-start-1 sm:row-start-1 sm:py-0">
            <IconButton
              label="Swap"
              onClick={() =>
                setText((t) => ({ original: t.changed, changed: t.original }))
              }
            >
              <ArrowLeftRight className="size-4" aria-hidden />
            </IconButton>
          </div>
          <h2
            className={cn(TITLE, "sm:col-start-2 sm:row-start-1 sm:text-right")}
          >
            Changed
          </h2>
          <HighlightEditor
            side="changed"
            label="Changed text"
            value={text.changed}
            onChange={(changed) => setText((t) => ({ ...t, changed }))}
            marks={changedMarks}
            lineHighlight={options.lineHighlight}
            charHighlight={options.charHighlight}
            onScrollTop={(top) => followOriginal.current?.(top)}
            followRef={followChanged}
          />
        </div>
      </div>
    </div>
  );
}
