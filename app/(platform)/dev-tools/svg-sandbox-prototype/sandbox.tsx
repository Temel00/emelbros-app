"use client";

// PROTOTYPE (#201): three layouts × tunable hot-reload feel. Throwaway; no persistence.
// A: split (stacked on mobile)  B: split (tabs on mobile)  C: preview-first, code in a sheet.
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import DOMPurify from "dompurify";
import { SaxesParser } from "saxes";

import type { EditorApi } from "./editor";

const Editor = dynamic(() => import("./editor"), {
  ssr: false,
  loading: () => <div className="p-3 text-sm opacity-60">Loading editor…</div>,
});

const INITIAL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120">
  <rect x="10" y="10" width="80" height="50" fill="#f59e0b" />
  <circle cx="150" cy="40" r="25" fill="#38bdf8" />
  <text x="20" y="100" font-size="14">Hello SVG</text>
</svg>
`;

type Tool = "none" | "rect" | "ellipse" | "line" | "text";
type Parsed =
  { ok: true } | { ok: false; line: number; col: number; msg: string };

function validate(src: string): Parsed {
  const p = new SaxesParser({ xmlns: true });
  let err: Parsed | null = null;
  p.on("error", (e) => {
    if (!err)
      err = {
        ok: false,
        line: p.line,
        col: p.column,
        msg: e.message.split("\n")[0],
      };
  });
  try {
    p.write(src).close();
  } catch {
    /* error captured above */
  }
  return err ?? { ok: true };
}

const sanitize = (src: string) =>
  DOMPurify.sanitize(src, { USE_PROFILES: { svg: true, svgFilters: true } });

const DEBOUNCES = [0, 150, 400, 800];
const r = (n: number) => Math.round(n * 10) / 10;

export function Sandbox({ variant }: { variant: string }) {
  const v = ["A", "B", "C"].includes(variant) ? variant : "A";
  const [debounceMs, setDebounceMs] = useState(150);
  const [invalidMode, setInvalidMode] = useState<"keep" | "replace">("keep");
  const [tool, setTool] = useState<Tool>("none");
  const [tab, setTab] = useState<"code" | "preview">("code");
  const [sheet, setSheet] = useState(true);
  const [pending, setPending] = useState(false);
  const [parsed, setParsed] = useState<Parsed>({ ok: true });
  const [good, setGood] = useState(() => sanitize(INITIAL));
  const [lastCanvas, setLastCanvas] = useState<number | null>(null);
  const apiRef = useRef<EditorApi | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const debounceRef = useRef(debounceMs);
  useEffect(() => {
    debounceRef.current = debounceMs;
  }, [debounceMs]);

  const onDoc = useCallback((doc: string, canvas: boolean) => {
    clearTimeout(timer.current);
    const run = () => {
      const res = validate(doc);
      setParsed(res);
      if (res.ok) setGood(sanitize(doc));
      setPending(false);
    };
    if (canvas) {
      setLastCanvas(Date.now());
      run(); // canvas edits render immediately
      return;
    }
    const ms = debounceRef.current;
    if (ms === 0) return run();
    setPending(true);
    timer.current = setTimeout(run, ms);
  }, []);

  const showError = !parsed.ok && invalidMode === "replace";
  const draw = (shape: string) => apiRef.current?.insertShape(shape);

  const code = (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        <Editor initial={INITIAL} onDoc={onDoc} apiRef={apiRef} />
      </div>
      <Status parsed={parsed} pending={pending} />
    </div>
  );
  const preview = (
    <Preview
      html={good}
      stale={!parsed.ok}
      showError={showError}
      parsed={parsed}
      tool={tool}
      onShape={draw}
      flash={lastCanvas}
    />
  );
  const toolbar = (orient: "row" | "col") => (
    <Toolbar tool={tool} setTool={setTool} orient={orient} />
  );

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <FeelBar
        debounceMs={debounceMs}
        setDebounceMs={setDebounceMs}
        invalidMode={invalidMode}
        setInvalidMode={setInvalidMode}
      />
      {v === "A" && (
        <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="min-h-0 flex-1 border-b md:border-r md:border-b-0">
            {code}
          </div>
          <div className="relative min-h-0 flex-1">
            <div className="absolute top-2 left-2 z-10">{toolbar("row")}</div>
            {preview}
          </div>
        </div>
      )}
      {v === "B" && (
        <>
          <div className="flex items-center gap-2 border-b px-2 py-1">
            <div className="flex gap-1 md:hidden">
              {(["code", "preview"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded px-3 py-1 text-sm ${tab === t ? "bg-foreground text-background" : "border"}`}
                >
                  {t}
                  {t === "code" && !parsed.ok ? " ⚠" : ""}
                </button>
              ))}
            </div>
            <div className="ml-auto">{toolbar("row")}</div>
          </div>
          <div className="flex min-h-0 flex-1">
            <div
              className={`min-h-0 flex-1 border-r ${tab === "code" ? "" : "hidden"} md:block`}
            >
              {code}
            </div>
            <div
              className={`min-h-0 flex-1 ${tab === "preview" ? "" : "hidden"} md:block`}
            >
              {preview}
            </div>
          </div>
        </>
      )}
      {v === "C" && (
        <div className="relative min-h-0 flex-1">
          <div className="absolute top-1/2 left-2 z-10 -translate-y-1/2">
            {toolbar("col")}
          </div>
          <div className="absolute inset-0">{preview}</div>
          <button
            onClick={() => setSheet((s) => !s)}
            className="bg-foreground text-background absolute right-2 bottom-2 z-30 rounded-full px-4 py-2 text-sm shadow-lg md:top-2 md:bottom-auto"
          >
            {sheet ? "hide code" : "show code"}
            {!parsed.ok ? " ⚠" : ""}
          </button>
          <div
            className={`bg-background absolute inset-x-0 bottom-0 z-20 h-[45%] border-t shadow-2xl md:inset-y-0 md:right-0 md:left-auto md:h-auto md:w-[45%] md:border-t-0 md:border-l ${sheet ? "" : "hidden"}`}
          >
            {code}
          </div>
        </div>
      )}
      <SwitcherBar current={v} />
    </div>
  );
}

function FeelBar(p: {
  debounceMs: number;
  setDebounceMs: (n: number) => void;
  invalidMode: "keep" | "replace";
  setInvalidMode: (m: "keep" | "replace") => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-2 py-1 text-xs">
      <span className="opacity-60">debounce</span>
      <span className="flex gap-1">
        {DEBOUNCES.map((n) => (
          <button
            key={n}
            onClick={() => p.setDebounceMs(n)}
            className={`rounded px-2 py-0.5 ${p.debounceMs === n ? "bg-foreground text-background" : "border"}`}
          >
            {n === 0 ? "instant" : `${n}ms`}
          </button>
        ))}
      </span>
      <span className="opacity-60">when invalid</span>
      <span className="flex gap-1">
        {(["keep", "replace"] as const).map((m) => (
          <button
            key={m}
            onClick={() => p.setInvalidMode(m)}
            className={`rounded px-2 py-0.5 ${p.invalidMode === m ? "bg-foreground text-background" : "border"}`}
          >
            {m === "keep" ? "keep last good" : "show error"}
          </button>
        ))}
      </span>
    </div>
  );
}

function Status({ parsed, pending }: { parsed: Parsed; pending: boolean }) {
  return (
    <div
      className={`border-t px-2 py-1 font-mono text-xs ${parsed.ok ? "" : "bg-red-500/15 text-red-600 dark:text-red-400"}`}
    >
      {parsed.ok
        ? pending
          ? "… updating"
          : "● live"
        : `⚠ ${parsed.line}:${parsed.col} ${parsed.msg}`}
    </div>
  );
}

function Toolbar({
  tool,
  setTool,
  orient,
}: {
  tool: Tool;
  setTool: (t: Tool) => void;
  orient: "row" | "col";
}) {
  const items: [Tool, string][] = [
    ["none", "↖"],
    ["rect", "▭"],
    ["ellipse", "◯"],
    ["line", "╱"],
    ["text", "T"],
  ];
  return (
    <div
      className={`bg-background/90 flex gap-1 rounded-lg border p-1 shadow ${orient === "col" ? "flex-col" : ""}`}
    >
      {items.map(([t, label]) => (
        <button
          key={t}
          aria-label={t}
          onClick={() => setTool(t)}
          className={`size-9 rounded text-lg ${tool === t ? "bg-foreground text-background" : ""}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

type Drag = { x0: number; y0: number; x1: number; y1: number };

function Preview({
  html,
  stale,
  showError,
  parsed,
  tool,
  onShape,
  flash,
}: {
  html: string;
  stale: boolean;
  showError: boolean;
  parsed: Parsed;
  tool: Tool;
  onShape: (s: string) => void;
  flash: number | null;
}) {
  const box = useRef<HTMLDivElement>(null);
  // drag is in SVG user units; ghost is its screen-space box, computed in the handlers
  const [drag, setDrag] = useState<Drag | null>(null);
  const [ghost, setGhost] = useState<React.CSSProperties | null>(null);
  const flashing = useFlash(flash);

  const svgPoint = (e: React.PointerEvent) => {
    const svg = box.current?.querySelector("svg");
    const m = svg?.getScreenCTM();
    if (!svg || !m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };
  const down = (e: React.PointerEvent) => {
    if (tool === "none") return;
    const p = svgPoint(e);
    if (!p) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
  };
  const move = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = svgPoint(e);
    if (!p) return;
    setDrag({ ...drag, x1: p.x, y1: p.y });
    const host = box.current!.getBoundingClientRect();
    const sx = e.clientX - host.left;
    const sy = e.clientY - host.top;
    const m = box.current!.querySelector("svg")!.getScreenCTM()!;
    const a = new DOMPoint(drag.x0, drag.y0).matrixTransform(m);
    const ax = a.x - host.left;
    const ay = a.y - host.top;
    setGhost({
      left: Math.min(ax, sx),
      top: Math.min(ay, sy),
      width: Math.abs(sx - ax),
      height: Math.abs(sy - ay),
    });
  };
  const up = () => {
    if (!drag) return;
    const { x0, y0, x1, y1 } = drag;
    setDrag(null);
    setGhost(null);
    const x = Math.min(x0, x1);
    const y = Math.min(y0, y1);
    const w = Math.abs(x1 - x0);
    const h = Math.abs(y1 - y0);
    if (tool === "rect")
      onShape(
        `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" fill="#a78bfa" />`,
      );
    if (tool === "ellipse")
      onShape(
        `<ellipse cx="${r(x + w / 2)}" cy="${r(y + h / 2)}" rx="${r(w / 2)}" ry="${r(h / 2)}" fill="#34d399" />`,
      );
    if (tool === "line")
      onShape(
        `<line x1="${r(x0)}" y1="${r(y0)}" x2="${r(x1)}" y2="${r(y1)}" stroke="#ef4444" stroke-width="2" />`,
      );
    if (tool === "text")
      onShape(`<text x="${r(x0)}" y="${r(y0)}" font-size="12">text</text>`);
  };

  return (
    <div
      ref={box}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      className={`relative h-full w-full touch-none overflow-hidden ${tool === "none" ? "" : "cursor-crosshair"} ${flashing ? "ring-primary ring-2 ring-inset" : ""}`}
      style={{
        backgroundImage:
          "repeating-conic-gradient(#8881 0% 25%, transparent 0% 50%)",
        backgroundSize: "16px 16px",
      }}
    >
      <div
        className={`flex h-full w-full items-center justify-center p-4 transition-opacity [&>svg]:max-h-full [&>svg]:w-full [&>svg]:max-w-full ${stale ? "opacity-50" : ""}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {ghost && (
        <div
          className="border-primary pointer-events-none absolute border border-dashed"
          style={ghost}
        />
      )}
      {stale && (
        <div className="pointer-events-none absolute top-2 right-2 rounded bg-red-600 px-2 py-1 text-xs text-white">
          showing last valid render
        </div>
      )}
      {showError && !parsed.ok && (
        <div className="bg-background/95 absolute inset-0 flex items-center justify-center p-6 text-center font-mono text-sm text-red-600">
          {parsed.line}:{parsed.col} {parsed.msg}
        </div>
      )}
    </div>
  );
}

function useFlash(t: number | null) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (t == null) return;
    const a = setTimeout(() => setOn(true), 0);
    const b = setTimeout(() => setOn(false), 350);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [t]);
  return on;
}

const KEYS = [
  ["A", "Split · stacked on mobile"],
  ["B", "Split · tabs on mobile"],
  ["C", "Preview-first · code sheet"],
] as const;

function SwitcherBar({ current }: { current: string }) {
  const router = useRouter();
  const i = KEYS.findIndex(([k]) => k === current);
  const go = (d: number) =>
    router.replace(`?variant=${KEYS[(i + d + KEYS.length) % KEYS.length][0]}`);
  return (
    <div className="fixed bottom-14 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black px-4 py-2 text-sm text-white shadow-lg md:bottom-4">
      <button
        aria-label="Previous variant"
        onClick={() => go(-1)}
        className="px-2"
      >
        ←
      </button>
      <span>
        {KEYS[i][0]} ({KEYS[i][1]})
      </span>
      <button aria-label="Next variant" onClick={() => go(1)} className="px-2">
        →
      </button>
    </div>
  );
}
