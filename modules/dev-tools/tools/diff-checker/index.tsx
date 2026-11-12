"use client";

import { ArrowLeftRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { HighlightEditor } from "./highlight-editor";
import { IconButton } from "./icon-button";
import { compare, lineMarks, type CompareOptions, type Snapshot } from "./lib";

const DEBOUNCE_MS = 250;
const TITLE = "text-xs font-semibold tracking-wide uppercase";
// Ignore options are wired to the options drawer in a later ticket.
const OPTIONS: CompareOptions = { ignoreWhitespace: false, ignoreCase: false };

export default function DiffChecker() {
  const [text, setText] = useState<Snapshot>({ original: "", changed: "" });
  const [lineHighlight] = useState(true);
  const [charHighlight] = useState(true);
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
  const rows = useMemo(() => {
    if (!debounced.original || !debounced.changed) return null;
    const result = compare(debounced.original, debounced.changed, OPTIONS);
    return result.tooLarge ? null : result.rows;
  }, [debounced]);
  const originalMarks = useMemo(
    () => (current && rows ? lineMarks(rows, "original") : undefined),
    [current, rows],
  );
  const changedMarks = useMemo(
    () => (current && rows ? lineMarks(rows, "changed") : undefined),
    [current, rows],
  );

  return (
    <div className="grid min-w-0 grid-cols-1 content-start gap-x-3 gap-y-1 sm:grid-cols-2">
      <h2 className={cn(TITLE, "sm:col-start-1 sm:row-start-1")}>Original</h2>
      <HighlightEditor
        side="original"
        label="Original text"
        value={text.original}
        onChange={(original) => setText((t) => ({ ...t, original }))}
        marks={originalMarks}
        lineHighlight={lineHighlight}
        charHighlight={charHighlight}
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
      <h2 className={cn(TITLE, "sm:col-start-2 sm:row-start-1 sm:text-right")}>
        Changed
      </h2>
      <HighlightEditor
        side="changed"
        label="Changed text"
        value={text.changed}
        onChange={(changed) => setText((t) => ({ ...t, changed }))}
        marks={changedMarks}
        lineHighlight={lineHighlight}
        charHighlight={charHighlight}
        onScrollTop={(top) => followOriginal.current?.(top)}
        followRef={followChanged}
      />
    </div>
  );
}
