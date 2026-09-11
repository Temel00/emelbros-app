"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #74 resolves.
 *
 * Round three. Round one settled the shape (the grid, variant C); round two
 * settled that the *total* should be the dominant number, coloured by the
 * multiplier (variant C1). This round keeps C1's big coloured total and only
 * varies **how the base segment rides along** — the owner didn't want C1's
 * "8×3" caption, and asked for a C3-style "T8"/"D8" corner tag instead, plus
 * one genuinely out-of-the-box take.
 *
 * All variants are the same grid — 20 numbers in numeric order, a sticky
 * S/D/T control that resets to Single after each dart, the same bull/25/miss
 * row — differing only in the number-key face. C1 is carried forward as the
 * baseline to compare against.
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

/** The corner tag for an armed multiplier: "D8" / "T8". */
function tag(segment: number, multiple: 1 | 2 | 3) {
  return `${multiple === 3 ? "T" : "D"}${segment}`;
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
 * The grid every variant shares: sticky multiplier control, the 20-key
 * numeric grid (each key's face supplied by `renderFace`), and the
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
// Variant C1 — total dominant (round-two baseline, carried forward)
// ---------------------------------------------------------------------------

/**
 * Round two's winner-so-far. Big coloured total; base as an "8×3" caption
 * above. Kept as the baseline this round is measured against — the size and
 * colour of the total are the parts the owner liked and every new face keeps.
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
// Variant T1 — centred total + corner tag (the explicit request)
// ---------------------------------------------------------------------------

/**
 * The one the owner asked for: keep C1's big coloured total, but drop the
 * "8×3" caption and show the base the C3 way — a small "T8"/"D8" tag in the
 * upper-left corner. The total is centred and owns the key; the tag confirms
 * which segment without competing for the middle.
 *
 * The bet: a corner tag reads as an annotation ("this is a treble 8") rather
 * than a second number fighting the total, so the grid stays scannable. The
 * risk: at 5-across the corner is small, and the tag is muted, not coloured —
 * confirm it's still readable at a glance.
 */
export function VariantT1(props: ScoringInputProps) {
  return (
    <CGrid
      {...props}
      renderFace={({ segment, multiple, computed }) =>
        multiple === 1
          ? { node: <span className="text-2xl font-black">{segment}</span> }
          : {
              node: (
                <>
                  <span className="absolute top-1 left-1.5 text-[10px] font-bold text-muted-foreground">
                    {tag(segment, multiple)}
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
// Variant T2 — corner chip + colour accent bar
// ---------------------------------------------------------------------------

/**
 * A step up in at-a-glance state from T1, a step short of C3's full flood.
 * Same centred coloured total, but the corner tag becomes a filled chip in
 * the multiplier colour, and a thin colour bar sits along the bottom edge of
 * every armed key. Three signals for "a multiplier is live" — the coloured
 * total, the chip, the bar — none of them a whole-key flood.
 *
 * The bet: the bottom bar makes the armed state legible across the whole grid
 * peripherally, without the heaviness of twenty flooded keys. The risk: it's
 * more chrome per key, and the chip + bar + total is a lot of the multiplier
 * colour repeated three ways.
 */
export function VariantT2(props: ScoringInputProps) {
  return (
    <CGrid
      {...props}
      renderFace={({ segment, multiple, computed }) =>
        multiple === 1
          ? { node: <span className="text-2xl font-black">{segment}</span> }
          : {
              node: (
                <>
                  <span
                    className="absolute top-1 left-1 rounded px-1 text-[10px] font-black text-background"
                    style={{ backgroundColor: armedColour(multiple) }}
                  >
                    {tag(segment, multiple)}
                  </span>
                  <span
                    className="text-3xl leading-none font-black"
                    style={{ color: armedColour(multiple) }}
                  >
                    {computed}
                  </span>
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-1"
                    style={{ backgroundColor: armedColour(multiple) }}
                  />
                </>
              ),
            }
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Variant G — ghost segment (the out-of-the-box one)
// ---------------------------------------------------------------------------

/**
 * The creative take, deliberately unlike C3's colour flood. Arming a
 * multiplier turns the *base segment* into a huge translucent watermark
 * filling the key, with the coloured total sitting bold and solid on top of
 * it. You read the total to score; the ghost behind it tells you the segment
 * and the multiplier (via the small "×3") without a tag in the corner at all.
 *
 * The bet: the base is present but unmistakably secondary — literally in the
 * background — which matches how it's used (you already know you wanted the
 * 8; you need the 24). It also gives each armed key a distinctive texture
 * that isn't just a colour swatch. The risk: a big number behind a big number
 * can read as visual noise; the watermark has to stay faint enough to recede.
 */
export function VariantG(props: ScoringInputProps) {
  return (
    <CGrid
      {...props}
      renderFace={({ segment, multiple, computed }) =>
        multiple === 1
          ? { node: <span className="text-2xl font-black">{segment}</span> }
          : {
              node: (
                <>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 flex items-center justify-center text-5xl font-black text-muted-foreground/20"
                  >
                    {segment}
                  </span>
                  <span
                    className="relative text-2xl leading-none font-black"
                    style={{ color: armedColour(multiple) }}
                  >
                    {computed}
                  </span>
                  <span className="relative text-[9px] font-bold text-muted-foreground">
                    ×{multiple}
                  </span>
                </>
              ),
            }
      }
    />
  );
}

export const SCORING_VARIANTS = [
  {
    key: "T1",
    name: "Centred total + corner tag",
    Component: VariantT1,
    note: "The request: big coloured total centred, small 'T8'/'D8' tag upper-left.",
  },
  {
    key: "T2",
    name: "Corner chip + accent bar",
    Component: VariantT2,
    note: "T1 plus a filled colour chip and a thin bottom bar — more at-a-glance state, no full flood.",
  },
  {
    key: "G",
    name: "Ghost segment (creative)",
    Component: VariantG,
    note: "The base segment becomes a big translucent watermark; the coloured total sits solid on top.",
  },
  {
    key: "C1",
    name: "Total dominant (baseline)",
    Component: VariantC1,
    note: "Round two's C1, carried forward: big coloured total with an '8×3' caption above.",
  },
] as const;
