"use client";

import { cn } from "@/lib/utils";
import type { ThrownDart } from "@/modules/darts/lib/engine";

/** Standard dartboard segment order, used only for the calculator's numbered layout (darts.md §3). */
const BOARD_ORDER = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
];

const CX = 210;
const CY = 210;
/** Enlarged centre (darts.md #7): bull and the 25 ring are bigger than a real board's, easier to tap. */
const R_BULL = 34;
const R_25 = 58;
/** single / double / treble ring boundaries, outward from the 25 ring — equal width (44 each). */
const RINGS = [R_25, 102, 146, 190];
const STEP = (2 * Math.PI) / 20;

function polar(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

/** An SVG path for one ring's wedge (an annular sector) between two radii and two angles. */
function annularSector(
  r1: number,
  r2: number,
  angleStart: number,
  angleEnd: number,
): string {
  const [x1, y1] = polar(CX, CY, r2, angleStart);
  const [x2, y2] = polar(CX, CY, r2, angleEnd);
  const [x3, y3] = polar(CX, CY, r1, angleEnd);
  const [x4, y4] = polar(CX, CY, r1, angleStart);
  const large = (angleEnd - angleStart) % (2 * Math.PI) > Math.PI ? 1 : 0;
  return `M${x1} ${y1} A${r2} ${r2} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${r1} ${r1} 0 ${large} 0 ${x4} ${y4} Z`;
}

const RING_FILL: Record<"single-a" | "single-b" | "double" | "treble", string> = {
  "single-a": "var(--color-card)",
  "single-b": "var(--color-muted)",
  double: "var(--color-c-green)",
  treble: "var(--color-c-blue)",
};

/**
 * The dartboard-shaped calculator (darts.md §3, prototype #7): enlarged bull
 * + three equal-width rings outward from it (single/double/treble) — the
 * tapped ring carries the multiplier, there's no separate S/D/T toggle. The
 * segment reachable by `checkoutTarget` in one dart glows, so a reachable
 * finish is visually obvious mid-turn.
 */
export function Dartboard({
  disabled,
  checkoutTarget,
  onThrow,
}: {
  disabled: boolean;
  checkoutTarget: ThrownDart | null;
  onThrow: (dart: ThrownDart) => void;
}) {
  function isTarget(segment: number, multiple: 1 | 2 | 3) {
    return (
      checkoutTarget !== null &&
      checkoutTarget.segment === segment &&
      checkoutTarget.multiple === multiple
    );
  }

  /** Tap/click/keyboard-activation props shared by every scoring shape (wedge, bull, outer bull). */
  function targetProps(segment: number, multiple: 1 | 2 | 3, ariaLabel: string) {
    const glow = isTarget(segment, multiple);
    return {
      glow,
      stroke: glow ? "var(--color-c-pink)" : "var(--color-border)",
      strokeWidth: glow ? 4 : 0.5,
      role: "button" as const,
      tabIndex: disabled ? -1 : 0,
      "aria-label": ariaLabel,
      "aria-disabled": disabled,
      onClick: () => !disabled && onThrow({ segment, multiple }),
      onKeyDown: (event: React.KeyboardEvent) => {
        if (disabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onThrow({ segment, multiple });
        }
      },
    };
  }

  function wedge(
    segment: number,
    multiple: 1 | 2 | 3,
    r1: number,
    r2: number,
    angleStart: number,
    angleEnd: number,
    fill: string,
  ) {
    const { glow, ...props } = targetProps(
      segment,
      multiple,
      `${multiple === 3 ? "Treble" : multiple === 2 ? "Double" : "Single"} ${segment}`,
    );
    return (
      <path
        key={`${segment}-${multiple}`}
        d={annularSector(r1, r2, angleStart, angleEnd)}
        fill={fill}
        className={cn("cursor-pointer transition-[filter] hover:brightness-110", glow && "animate-pulse")}
        {...props}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 420 420"
      role="img"
      aria-label="Dartboard calculator — tap a ring to score a dart"
      className={cn("mx-auto w-full max-w-[420px]", disabled && "opacity-60")}
    >
      {BOARD_ORDER.map((segment, i) => {
        const angleStart = -Math.PI / 2 - STEP / 2 + i * STEP;
        const angleEnd = angleStart + STEP;
        const alt = i % 2 === 0;
        const singleFill = alt ? RING_FILL["single-a"] : RING_FILL["single-b"];
        const [labelX, labelY] = polar(CX, CY, 202, angleStart + STEP / 2);

        return (
          <g key={segment}>
            {wedge(segment, 1, RINGS[0], RINGS[1], angleStart, angleEnd, singleFill)}
            {wedge(segment, 2, RINGS[1], RINGS[2], angleStart, angleEnd, RING_FILL.double)}
            {wedge(segment, 3, RINGS[2], RINGS[3], angleStart, angleEnd, RING_FILL.treble)}
            <text
              x={labelX}
              y={labelY}
              fontSize={15}
              fontWeight={800}
              fill="var(--color-foreground)"
              textAnchor="middle"
              dominantBaseline="central"
              className="pointer-events-none select-none"
            >
              {segment}
            </text>
          </g>
        );
      })}

      {(() => {
        const { glow, ...props } = targetProps(25, 1, "25 (outer bull)");
        return (
          <circle
            cx={CX}
            cy={CY}
            r={R_25}
            fill="var(--color-c-yellow)"
            className={cn("cursor-pointer transition-[filter] hover:brightness-110", glow && "animate-pulse")}
            {...props}
          />
        );
      })()}
      {(() => {
        const { glow, ...props } = targetProps(50, 1, "Bull (50)");
        return (
          <circle
            cx={CX}
            cy={CY}
            r={R_BULL}
            fill="var(--color-foreground)"
            className={cn("cursor-pointer transition-[filter] hover:brightness-125", glow && "animate-pulse")}
            {...props}
          />
        );
      })()}
      <text
        x={CX}
        y={CY}
        fontSize={12}
        fontWeight={800}
        fill="var(--color-background)"
        textAnchor="middle"
        dominantBaseline="central"
        className="pointer-events-none select-none"
      >
        BULL
      </text>
    </svg>
  );
}
