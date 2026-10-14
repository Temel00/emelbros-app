"use client";

import { useRef, useState } from "react";

import type { ViewBox } from "./lib/parse-svg";
import { shapeGeometry, type ShapeDescriptor } from "./lib/shapes";

type Point = { x: number; y: number };

/** Drags shorter than this many screen pixels are taps, not shapes. */
const MIN_DRAG_PX = 4;

const ELEMENT = { rect: "rect", ellipse: "ellipse", line: "line" } as const;

/**
 * Transparent SVG laid over the preview (same viewBox, so it shares the
 * preview's coordinate system). Pointer Events cover mouse, touch and pen;
 * screen points map to viewBox units through `getScreenCTM().inverse()`.
 * It only reports finished drags; the Tool decides what to do with them.
 */
export function DrawOverlay({
  tool,
  viewBox,
  onDraw,
}: {
  tool: ShapeDescriptor["tool"];
  viewBox: ViewBox;
  onDraw: (descriptor: ShapeDescriptor) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const startClient = useRef<Point | null>(null);
  const [drag, setDrag] = useState<{ start: Point; end: Point } | null>(null);

  const toViewBox = (e: React.PointerEvent): Point => {
    const el = svg.current!;
    const pt = el.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(el.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };

  const finish = (e: React.PointerEvent, commit: boolean) => {
    const origin = startClient.current;
    if (!origin || !drag) return;
    startClient.current = null;
    svg.current?.releasePointerCapture(e.pointerId);
    const end = toViewBox(e);
    setDrag(null);
    const moved = Math.hypot(e.clientX - origin.x, e.clientY - origin.y);
    if (commit && moved >= MIN_DRAG_PX)
      onDraw({ tool, start: drag.start, end });
  };

  const ghost = drag
    ? Object.fromEntries(shapeGeometry({ tool, ...drag }, viewBox))
    : null;
  const Ghost = ELEMENT[tool];

  return (
    <svg
      ref={svg}
      aria-label="Drawing surface"
      viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
      className="absolute inset-0 size-full cursor-crosshair touch-none"
      onPointerDown={(e) => {
        if (e.button !== 0 && e.pointerType === "mouse") return;
        e.currentTarget.setPointerCapture(e.pointerId);
        startClient.current = { x: e.clientX, y: e.clientY };
        const p = toViewBox(e);
        setDrag({ start: p, end: p });
      }}
      onPointerMove={(e) => {
        if (startClient.current) {
          const end = toViewBox(e);
          setDrag((d) => (d ? { ...d, end } : d));
        }
      }}
      onPointerUp={(e) => finish(e, true)}
      onPointerCancel={(e) => finish(e, false)}
    >
      {ghost && (
        <Ghost
          {...ghost}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
          className="text-primary"
        />
      )}
    </svg>
  );
}
