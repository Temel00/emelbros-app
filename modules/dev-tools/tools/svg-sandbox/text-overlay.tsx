"use client";

import { useRef, useState } from "react";

import type { ViewBox } from "./lib/parse-svg";

type Point = { x: number; y: number };

/**
 * Transparent SVG over the preview. A click opens an inline input at that
 * point; Enter or blur commits, Escape cancels. The Tool decides what an
 * empty or non-empty commit means.
 */
export function TextOverlay({
  viewBox,
  onCommit,
}: {
  viewBox: ViewBox;
  onCommit: (at: Point, content: string) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const done = useRef(false);
  const [at, setAt] = useState<Point | null>(null);

  const finish = (value: string, commit: boolean) => {
    if (done.current || !at) return;
    done.current = true;
    setAt(null);
    if (commit) onCommit(at, value);
  };

  return (
    <>
      <svg
        ref={svg}
        aria-label="Text surface"
        viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
        className="absolute inset-0 size-full cursor-text"
        onPointerDown={(e) => {
          if (at) return;
          const el = svg.current!;
          const pt = el.createSVGPoint();
          pt.x = e.clientX;
          pt.y = e.clientY;
          const p = pt.matrixTransform(el.getScreenCTM()!.inverse());
          e.preventDefault(); // keep focus for the input that mounts next
          done.current = false;
          setAt({ x: p.x, y: p.y });
        }}
      />
      {at && (
        <input
          autoFocus
          aria-label="Text content"
          className="absolute min-w-[6ch] -translate-y-full border border-primary bg-background/80 px-1 text-sm outline-none"
          style={{
            left: `${((at.x - viewBox.minX) / viewBox.width) * 100}%`,
            top: `${((at.y - viewBox.minY) / viewBox.height) * 100}%`,
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") finish(e.currentTarget.value, true);
            else if (e.key === "Escape") finish("", false);
          }}
          onBlur={(e) => finish(e.currentTarget.value, true)}
        />
      )}
    </>
  );
}
