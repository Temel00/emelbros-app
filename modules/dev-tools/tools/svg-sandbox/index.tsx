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
import { DrawOverlay } from "./draw-overlay";
import { TextOverlay } from "./text-overlay";
import { loadDraft, saveDraft } from "./lib/draft";
import { EMPTY_PREVIEW, nextPreview } from "./lib/hot-reload";
import { parseSvg, type ViewBox } from "./lib/parse-svg";
import { sanitiseSvg } from "./lib/sanitise-svg";
import {
  describeShape,
  describeText,
  insertionChange,
  type ShapeDescriptor,
} from "./lib/shapes";

const CodeEditor = dynamic(() => import("./code-editor"), {
  ssr: false,
  loading: () => (
    <p className="p-3 text-sm text-muted-foreground">Loading editor…</p>
  ),
});

const RELOAD_DEBOUNCE_MS = 150;
const DRAFT_DEBOUNCE_MS = 500;

type DrawTool = ShapeDescriptor["tool"];

type ActiveTool = DrawTool | "text";

const DRAW_TOOLS: { label: string; tool: DrawTool; Icon: typeof Square }[] = [
  { label: "Rectangle", tool: "rect", Icon: Square },
  { label: "Ellipse", tool: "ellipse", Icon: Circle },
  { label: "Line", tool: "line", Icon: Minus },
];

export default function SvgSandbox() {
  const [initial] = useState(loadDraft);
  const [preview, setPreview] = useState(EMPTY_PREVIEW);
  const [history, setHistory] = useState<HistoryState>({
    canUndo: false,
    canRedo: false,
  });
  const [tool, setTool] = useState<ActiveTool | null>(null);
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

  // Draw actions patch the text, then render at once, skipping the debounce.
  const insert = useCallback((build: (viewBox: ViewBox) => string | null) => {
    const api = apiRef.current;
    if (!api) return;
    const text = api.getText();
    const parsed = parseSvg(text);
    // Re-check against the live text: the preview's error state lags by the debounce.
    if (!parsed.ok || !parsed.viewBox) return;
    const element = build(parsed.viewBox);
    if (element === null) return;
    api.applyDraw(insertionChange(text, parsed, element));
    clearTimeout(reloadTimer.current);
    const next = api.getText();
    setPreview((prev) => nextPreview(prev, next, sanitiseSvg));
  }, []);

  const draw = useCallback(
    (d: ShapeDescriptor) => insert((vb) => describeShape(d, vb)),
    [insert],
  );
  const addText = useCallback(
    (at: { x: number; y: number }, content: string) =>
      insert((vb) => describeText(at, content, vb)),
    [insert],
  );

  useEffect(
    () => () => {
      clearTimeout(reloadTimer.current);
      clearTimeout(draftTimer.current);
    },
    [],
  );

  const { error, html, viewBox } = preview;
  const drawHint = error
    ? "Fix the SVG to draw"
    : !viewBox
      ? "Add a viewBox to draw"
      : null;

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
        <div className="ml-auto flex items-center gap-1">
          {drawHint && (
            <span className="mr-1 text-xs text-muted-foreground">
              {drawHint}
            </span>
          )}
          {DRAW_TOOLS.map(({ label, tool: t, Icon }) => (
            <Button
              key={label}
              size="icon-sm"
              variant={tool === t ? "default" : "ghost"}
              aria-label={label}
              aria-pressed={tool === t}
              title={drawHint ?? label}
              disabled={drawHint !== null}
              onClick={() => setTool(tool === t ? null : t)}
            >
              <Icon />
            </Button>
          ))}
          <Button
            size="icon-sm"
            variant={tool === "text" ? "default" : "ghost"}
            aria-label="Text"
            aria-pressed={tool === "text"}
            title={drawHint ?? "Text"}
            disabled={drawHint !== null}
            onClick={() => setTool(tool === "text" ? null : "text")}
          >
            <Type />
          </Button>
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
              {tool === "text" && viewBox && !error && (
                <TextOverlay viewBox={viewBox} onCommit={addText} />
              )}
              {tool && tool !== "text" && viewBox && !error && (
                <DrawOverlay tool={tool} viewBox={viewBox} onDraw={draw} />
              )}
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
