"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #74 resolves.
 *
 * Round two. Round one (five shapes: board variants + a grid + a two-step
 * pad) settled the *shape* — the owner picked the grid, variant C. This round
 * only varies the **face of a number key when a multiplier is armed**: how the
 * base number (8) and the computed value (24 on a treble) share the key.
 *
 * All four are the same grid — 20 numbers in numeric order, a sticky S/D/T
 * control that resets to Single after each dart, and the same bull/25/miss
 * row. They differ *only* in the number-key face, so the comparison is clean.
 *
 * Still a drop-in replacement for `Dartboard`: same
 * `{ disabled, checkoutTarget, onThrow }` seam, one `ThrownDart` at a time
 * (#5 model fixed), pink checkout glow preserved, double=green / treble=blue.
 *
 * Focus: every interactive element sets `outline-none` and paints its own
 * `:focus-visible` ring, which pointer taps don't match — the #74 focus fix.
 */

import { useState } from "react";

import { cn } from "@/lib/utils";
import { type ThrownDart } from "@/modules/darts/lib/engine";

export type ScoringInputProps = {
  disabled: boolean;
  checkoutTarget: ThrownDart | null;
  onThrow: (dart: ThrownDart) => void;
};

/** Numeric order — you read a number, you don't aim at it. */
const NUMERIC_ORDER = Array.from({ length: 20 }, (_, i) => i + 1);

const DOUBLE_FILL = "var(--color-c-green)";
const TREBLE_FILL = "var(--color-c-blue)";

/** Keyboard focus, on HTML buttons. */
const HTML_FOCUS =
  "outline-none focus-visible:ring-4 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function multiplierName(multiple: 1 | 2 | 3) {
  return multiple === 3 ? "Treble" : multiple === 2 ? "Double" : "Single";
}

function armedColour(multiple: 1 | 2 | 3): string | undefined {
  return multiple === 2
    ? DOUBLE_FILL
    : multiple === 3
      ? TREBLE_FILL
      : undefined;
}

function isTarget(
  checkoutTarget: ThrownDart | null,
  segment: number,
  multiple: 1 | 2 | 3,
) {
  return (
    checkoutTarget !== null &&
    checkoutTarget.segment === segment &&
    checkoutTarget.multiple === multiple
  );
}

// ---------------------------------------------------------------------------
// Shared scaffold — the whole grid except the face of a number key
// ---------------------------------------------------------------------------

type Face = {
  /** Inner content of the number button. */
  node: React.ReactNode;
  /** Extra classes on the button (e.g. a colour flood). */
  className?: string;
  style?: React.CSSProperties;
};

type FaceRenderer = (args: {
  segment: number;
  multiple: 1 | 2 | 3;
  computed: number;
  glow: boolean;
}) => Face;

/**
 * The grid every C-family variant shares: sticky multiplier control, the
 * 20-key numeric grid (each key's face supplied by `renderFace`), and the
 * bull / 25 / miss row. Multiplier resets to Single after each dart.
 */
function CGrid({
  disabled,
  checkoutTarget,
  onThrow,
  renderFace,
}: ScoringInputProps & { renderFace: FaceRenderer }) {
  const [multiple, setMultiple] = useState<1 | 2 | 3>(1);

  function throwDart(dart: ThrownDart) {
    if (disabled) return;
    onThrow(dart);
    setMultiple(1);
  }

  return (
    <div className={cn("flex flex-col gap-2", disabled && "opacity-60")}>
      <div
        role="group"
        aria-label="Multiplier"
        className="grid grid-cols-3 gap-1.5"
      >
        {([1, 2, 3] as const).map((m) => {
          const active = multiple === m;
          return (
            <button
              key={m}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => setMultiple(m)}
              className={cn(
                "h-12 rounded-xl border-2 text-sm font-black tracking-wide uppercase transition-colors",
                HTML_FOCUS,
                active
                  ? "border-transparent text-background"
                  : "border-border bg-card text-muted-foreground",
              )}
              style={
                active
                  ? {
                      backgroundColor:
                        m === 1 ? "var(--color-foreground)" : armedColour(m),
                    }
                  : undefined
              }
            >
              {multiplierName(m)}
              <span className="ml-1 opacity-70">×{m}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {NUMERIC_ORDER.map((segment) => {
          const glow = isTarget(checkoutTarget, segment, multiple);
          const face = renderFace({
            segment,
            multiple,
            computed: segment * multiple,
            glow,
          });
          return (
            <button
              key={segment}
              type="button"
              disabled={disabled}
              aria-label={`${multiplierName(multiple)} ${segment}`}
              onClick={() => throwDart({ segment, multiple })}
              className={cn(
                "relative flex h-16 flex-col items-center justify-center overflow-hidden rounded-xl border border-border bg-card tabular-nums transition-transform active:scale-95",
                HTML_FOCUS,
                glow && "animate-pulse border-2 border-c-pink",
                face.className,
              )}
              style={face.style}
            >
              {face.node}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          disabled={disabled}
          aria-label="25 (outer bull)"
          onClick={() => throwDart({ segment: 25, multiple: 1 })}
          className={cn(
            "h-14 rounded-xl border border-border text-lg font-black text-[#3a2c00]",
            HTML_FOCUS,
            isTarget(checkoutTarget, 25, 1) && "animate-pulse",
          )}
          style={{ backgroundColor: "var(--color-c-yellow)" }}
        >
          25
        </button>
        <button
          type="button"
          disabled={disabled}
          aria-label="Bull (50)"
          onClick={() => throwDart({ segment: 50, multiple: 1 })}
          className={cn(
            "h-14 rounded-xl bg-foreground text-lg font-black text-background",
            HTML_FOCUS,
            isTarget(checkoutTarget, 50, 1) &&
              "animate-pulse ring-4 ring-c-pink",
          )}
        >
          BULL 50
        </button>
        <button
          type="button"
          disabled={disabled}
          aria-label="Miss (no score)"
          onClick={() => throwDart({ segment: 0, multiple: 1 })}
          className={cn(
            "h-14 rounded-xl border border-dashed border-border bg-muted text-sm font-bold text-muted-foreground",
            HTML_FOCUS,
          )}
        >
          MISS
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variant C — original (baseline for this round)
// ---------------------------------------------------------------------------

/**
 * Exactly round one's C. Big base number, computed value as a small caption
 * underneath when a multiplier is armed. Kept so the three new faces are
 * judged against it, not against memory.
 */
export function VariantC(props: ScoringInputProps) {
  return (
    <CGrid
      {...props}
      renderFace={({ segment, multiple, computed }) => ({
        node: (
          <>
            <span
              className="text-xl font-black"
              style={
                armedColour(multiple)
                  ? { color: armedColour(multiple) }
                  : undefined
              }
            >
              {segment}
            </span>
            {multiple > 1 && (
              <span className="text-[10px] font-bold opacity-70">
                {computed}
              </span>
            )}
          </>
        ),
      })}
    />
  );
}

// ---------------------------------------------------------------------------
// Variant C1 — total dominant
// ---------------------------------------------------------------------------

/**
 * "The 24 gets bigger on the 8." Once a multiplier is armed, the value you're
 * actually scoring becomes the big number and the base drops to a small
 * "8×3" caption above it. The bet: mid-leg you're doing subtraction, and the
 * number that matters for that is the total, not the segment. The risk: the
 * key you *aim your eye at* is still the base number (you know you want the
 * 8), so shrinking it may make the grid harder to scan.
 */
export function VariantC1(props: ScoringInputProps) {
  return (
    <CGrid
      {...props}
      renderFace={({ segment, multiple, computed }) =>
        multiple === 1
          ? { node: <span className="text-2xl font-black">{segment}</span> }
          : {
              node: (
                <>
                  <span className="text-[11px] font-bold text-muted-foreground">
                    {segment}×{multiple}
                  </span>
                  <span
                    className="text-3xl leading-none font-black"
                    style={{ color: armedColour(multiple) }}
                  >
                    {computed}
                  </span>
                </>
              ),
            }
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Variant C2 — diagonal corners
// ---------------------------------------------------------------------------

/**
 * "8 top-left, 24 bottom-right." The base number anchors the corner you scan
 * for; the total sits diagonally opposite, coloured by the multiplier. Both
 * are legible without one hiding under the other. The bet: a stable base-number
 * position keeps the grid scannable while still surfacing the total. The risk:
 * two corners is busier than a centred number, and at 5-across the corners are
 * tight.
 */
export function VariantC2(props: ScoringInputProps) {
  return (
    <CGrid
      {...props}
      renderFace={({ segment, multiple, computed }) =>
        multiple === 1
          ? { node: <span className="text-2xl font-black">{segment}</span> }
          : {
              node: (
                <>
                  <span className="absolute top-1 left-2 text-xs font-bold text-muted-foreground">
                    {segment}
                  </span>
                  <span
                    className="absolute right-2 bottom-0.5 text-2xl font-black"
                    style={{ color: armedColour(multiple) }}
                  >
                    {computed}
                  </span>
                </>
              ),
            }
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Variant C3 — colour flood (creative)
// ---------------------------------------------------------------------------

/**
 * The creative one. Arming a multiplier doesn't just tint a number — it floods
 * the whole key in the multiplier's colour and shows the total big, with a
 * small "T8" tag in the corner so you can still confirm the segment. The armed
 * grid becomes an unmistakable block of green or blue: you can see *at a
 * glance* that a multiplier is live, which is the exact failure mode of a
 * sticky multiplier (throwing a treble you forgot was armed). The risk: twenty
 * flooded keys is a lot of colour, and it leans on colour to signal state —
 * though the corner tag and the total both carry it too, so it isn't
 * colour-only.
 */
export function VariantC3(props: ScoringInputProps) {
  return (
    <CGrid
      {...props}
      renderFace={({ segment, multiple, computed }) =>
        multiple === 1
          ? { node: <span className="text-2xl font-black">{segment}</span> }
          : {
              className: "border-transparent text-background",
              style: { backgroundColor: armedColour(multiple) },
              node: (
                <>
                  <span className="absolute top-1 left-1.5 text-[10px] font-black tracking-wide opacity-90">
                    {multiple === 3 ? "T" : "D"}
                    {segment}
                  </span>
                  <span className="text-3xl font-black">{computed}</span>
                </>
              ),
            }
      }
    />
  );
}

export const SCORING_VARIANTS = [
  {
    key: "C",
    name: "Original (caption below)",
    Component: VariantC,
    note: "Round one's C. Big base number, small computed value underneath when armed.",
  },
  {
    key: "C1",
    name: "Total dominant",
    Component: VariantC1,
    note: "Armed: the computed total becomes the big number, base shrinks to an '8×3' caption above.",
  },
  {
    key: "C2",
    name: "Diagonal corners",
    Component: VariantC2,
    note: "Armed: base number top-left, computed total bottom-right, coloured by multiplier.",
  },
  {
    key: "C3",
    name: "Colour flood (creative)",
    Component: VariantC3,
    note: "Armed: the whole key floods with the multiplier colour, big total, corner 'T8' tag.",
  },
] as const;
