"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Circle,
  Minus,
  Redo2,
  Square,
  TriangleAlert,
  Type,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { EditorApi, HistoryState } from "./code-editor";
import { loadDraft, saveDraft } from "./lib/draft";
import { EMPTY_PREVIEW, nextPreview } from "./lib/hot-reload";
import { sanitiseSvg } from "./lib/sanitise-svg";

const CodeEditor = dynamic(() => import("./code-editor"), {
  ssr: false,
  loading: () => (
    <p className="p-3 text-sm text-muted-foreground">Loading editor…</p>
  ),
});

const RELOAD_DEBOUNCE_MS = 150;
const DRAFT_DEBOUNCE_MS = 500;

// Draw tools arrive in a later slice; shown disabled so the strip is final.
const DRAW_TOOLS = [
  { label: "Rectangle", Icon: Square },
  { label: "Ellipse", Icon: Circle },
  { label: "Line", Icon: Minus },
  { label: "Text", Icon: Type },
];

export default function SvgSandbox() {
  const [initial] = useState(loadDraft);
  const [preview, setPreview] = useState(EMPTY_PREVIEW);
  const [history, setHistory] = useState<HistoryState>({
    canUndo: false,
    canRedo: false,
  });
  const [tab, setTab] = useState<"code" | "preview">("code");
  const apiRef = useRef<EditorApi | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const draftTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const first = useRef(true);

  const onChange = useCallback((text: string) => {
    const run = () =>
      setPreview((prev) => nextPreview(prev, text, sanitiseSvg));
    clearTimeout(reloadTimer.current);
    clearTimeout(draftTimer.current);
    // The editor reports its initial text once on mount: render it right away.
    if (first.current) {
      first.current = false;
      run();
    } else {
      reloadTimer.current = setTimeout(run, RELOAD_DEBOUNCE_MS);
      draftTimer.current = setTimeout(() => saveDraft(text), DRAFT_DEBOUNCE_MS);
    }
  }, []);

  useEffect(
    () => () => {
      clearTimeout(reloadTimer.current);
      clearTimeout(draftTimer.current);
    },
    [],
  );

  const { error, html, viewBox } = preview;

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] min-h-96 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-1.5">
        <div className="flex gap-1 md:hidden" role="tablist">
          {(["code", "preview"] as const).map((t) => (
            <Button
              key={t}
              role="tab"
              aria-selected={tab === t}
              size="sm"
              variant={tab === t ? "default" : "outline"}
              onClick={() => setTab(t)}
              className="capitalize"
            >
              {t}
              {t === "code" && error && (
                <TriangleAlert aria-label="Invalid SVG" />
              )}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Undo"
            disabled={!history.canUndo}
            onClick={() => apiRef.current?.undo()}
          >
            <Undo2 />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Redo"
            disabled={!history.canRedo}
            onClick={() => apiRef.current?.redo()}
          >
            <Redo2 />
          </Button>
        </div>
        <div className="ml-auto flex gap-1">
          {DRAW_TOOLS.map(({ label, Icon }) => (
            <Button
              key={label}
              size="icon-sm"
              variant="ghost"
              aria-label={label}
              title="Drawing arrives in a later update"
              disabled
            >
              <Icon />
            </Button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <section
          aria-label="SVG code"
          className={cn(
            "min-h-0 min-w-0 flex-1 flex-col border-border md:flex md:border-r",
            tab === "code" ? "flex" : "hidden",
          )}
        >
          <div className="min-h-0 flex-1">
            <CodeEditor
              initial={initial}
              onChange={onChange}
              onHistory={setHistory}
              apiRef={apiRef}
            />
          </div>
          <p
            role="status"
            className={cn(
              "border-t border-border px-3 py-1 font-mono text-xs",
              error
                ? "bg-destructive/10 text-destructive"
                : "text-muted-foreground",
            )}
          >
            {error
              ? `${error.line}:${error.col} ${error.message}`
              : "Valid SVG"}
          </p>
        </section>

        <section
          aria-label="Preview"
          className={cn(
            "relative min-h-0 min-w-0 flex-1 md:flex",
            tab === "preview" ? "flex" : "hidden",
          )}
        >
          <div className="flex size-full items-center justify-center overflow-hidden p-8">
            <div
              className={cn(
                "relative max-h-full max-w-full",
                viewBox
                  ? "w-full outline-1 outline-dotted outline-muted-foreground"
                  : "size-full",
                error && "opacity-50",
              )}
              style={
                viewBox
                  ? { aspectRatio: `${viewBox.width} / ${viewBox.height}` }
                  : undefined
              }
            >
              {viewBox && (
                <span className="absolute -top-5 left-0 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                  viewBox {viewBox.minX} {viewBox.minY} {viewBox.width}{" "}
                  {viewBox.height}
                </span>
              )}
              <div
                className="size-full [&>svg]:size-full"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          </div>
          {error && (
            <p className="pointer-events-none absolute top-2 right-2 rounded bg-destructive px-2 py-1 text-xs text-white">
              Showing last valid render
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
