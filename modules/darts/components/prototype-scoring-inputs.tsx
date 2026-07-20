"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #74 resolves.
 *
 * Five shapes for the darts scoring input, all drop-in replacements for
 * `Dartboard` — same `{ disabled, checkoutTarget, onThrow }` seam, all still
 * emitting one `ThrownDart` at a time, because the per-dart data model from
 * #5 is fixed and no shape is allowed to change it.
 *
 * The question (#74): singles are the most-thrown target and the hardest to
 * hit. On the current board they are the *innermost* of three equal-width
 * 44px rings, so they have the smallest arc length of the three.
 *
 * Rough target areas for a numbered segment, at the 420px viewBox
 * (width × arc length at the ring's mid-radius, one twentieth of the circle):
 *
 *   variant            single    double   treble
 *   0 current          ~1.1k     ~1.7k    ~2.3k
 *   A fat singles      ~2.9k     ~1.0k    ~1.2k
 *   B singles outside  ~2.9k     ~1.4k    ~1.1k
 *
 * A and B buy the same singles area by opposite means: A widens the inner
 * band, B moves singles to the outer band where arc length is greatest.
 * C and D abandon the board metaphor entirely.
 *
 * Focus treatment (also #74): every shape here sets `outline-none` and paints
 * its *own* focus ring under `:focus-visible`, which pointer taps do not
 * match — that is the whole fix for the "outline lingers after I tap a score"
 * report. The current board sets neither, so what shows on tap is the
 * browser default. Note the focus ring is deliberately NOT pink: pink at
 * strokeWidth 4 is already spoken for by the checkout glow.
 */

import { useState } from "react";

import { cn } from "@/lib/utils";
import { dartValue, type ThrownDart } from "@/modules/darts/lib/engine";

export type ScoringInputProps = {
  disabled: boolean;
  checkoutTarget: ThrownDart | null;
  onThrow: (dart: ThrownDart) => void;
};

/** Standard dartboard segment order (darts.md §3). */
const BOARD_ORDER = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
];

/** Numeric order, for the shapes that aren't pretending to be a board. */
const NUMERIC_ORDER = Array.from({ length: 20 }, (_, i) => i + 1);

const CX = 210;
const CY = 210;
const R_BULL = 34;
const R_25 = 58;
const STEP = (2 * Math.PI) / 20;

const DOUBLE_FILL = "var(--color-c-green)";
const TREBLE_FILL = "var(--color-c-blue)";
const SINGLE_A = "var(--color-card)";
const SINGLE_B = "var(--color-muted)";

/** Keyboard focus, on SVG shapes. CSS beats the presentation attribute, so this wins over `stroke`. */
const SVG_FOCUS =
  "outline-none [&:focus-visible]:[stroke:var(--color-foreground)] [&:focus-visible]:[stroke-width:5] [&:focus-visible]:[stroke-dasharray:6_4]";

/** Keyboard focus, on HTML buttons. */
const HTML_FOCUS =
  "outline-none focus-visible:ring-4 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function polar(r: number, angle: number): [number, number] {
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)];
}

function annularSector(
  r1: number,
  r2: number,
  angleStart: number,
  angleEnd: number,
): string {
  const [x1, y1] = polar(r2, angleStart);
  const [x2, y2] = polar(r2, angleEnd);
  const [x3, y3] = polar(r1, angleEnd);
  const [x4, y4] = polar(r1, angleStart);
  const large = (angleEnd - angleStart) % (2 * Math.PI) > Math.PI ? 1 : 0;
  return `M${x1} ${y1} A${r2} ${r2} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${r1} ${r1} 0 ${large} 0 ${x4} ${y4} Z`;
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

function multiplierName(multiple: 1 | 2 | 3) {
  return multiple === 3 ? "Treble" : multiple === 2 ? "Double" : "Single";
}

// ---------------------------------------------------------------------------
// Shared dartboard renderer for the two board-shaped variants
// ---------------------------------------------------------------------------

type Band = { multiple: 1 | 2 | 3; r1: number; r2: number };

/**
 * Renders a dartboard whose three bands are positioned by `bands`, outward
 * from the 25 ring. Everything else — enlarged bull, checkout glow, colour
 * coding, the one-dart-at-a-time emit — matches the live board, so the only
 * thing under test is where the bands sit and how wide they are.
 */
function BoardShape({
  disabled,
  checkoutTarget,
  onThrow,
  bands,
  labelRadius,
}: ScoringInputProps & { bands: Band[]; labelRadius: number }) {
  function targetProps(segment: number, multiple: 1 | 2 | 3) {
    const glow = isTarget(checkoutTarget, segment, multiple);
    return {
      glow,
      stroke: glow ? "var(--color-c-pink)" : "var(--color-border)",
      strokeWidth: glow ? 4 : 0.5,
      role: "button" as const,
      tabIndex: disabled ? -1 : 0,
      "aria-label":
        segment === 50
          ? "Bull (50)"
          : segment === 25
            ? "25 (outer bull)"
            : `${multiplierName(multiple)} ${segment}`,
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

  const outerRadius = Math.max(...bands.map((b) => b.r2));

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
        const [labelX, labelY] = polar(labelRadius, angleStart + STEP / 2);

        return (
          <g key={segment}>
            {bands.map((band) => {
              const { glow, ...props } = targetProps(segment, band.multiple);
              const fill =
                band.multiple === 2
                  ? DOUBLE_FILL
                  : band.multiple === 3
                    ? TREBLE_FILL
                    : alt
                      ? SINGLE_A
                      : SINGLE_B;
              return (
                <path
                  key={band.multiple}
                  d={annularSector(band.r1, band.r2, angleStart, angleEnd)}
                  fill={fill}
                  className={cn(
                    "cursor-pointer transition-[filter] hover:brightness-110",
                    SVG_FOCUS,
                    glow && "animate-pulse",
                  )}
                  {...props}
                />
              );
            })}
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
        const { glow, ...props } = targetProps(25, 1);
        return (
          <circle
            cx={CX}
            cy={CY}
            r={R_25}
            fill="var(--color-c-yellow)"
            className={cn(
              "cursor-pointer transition-[filter] hover:brightness-110",
              SVG_FOCUS,
              glow && "animate-pulse",
            )}
            {...props}
          />
        );
      })()}
      {(() => {
        const { glow, ...props } = targetProps(50, 1);
        return (
          <circle
            cx={CX}
            cy={CY}
            r={R_BULL}
            fill="var(--color-foreground)"
            className={cn(
              "cursor-pointer transition-[filter] hover:brightness-125",
              SVG_FOCUS,
              glow && "animate-pulse",
            )}
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

      {/* Miss — the board has no home for it today; parked outside the rings. */}
      <circle
        cx={CX}
        cy={outerRadius + 14}
        r={13}
        fill="var(--color-muted)"
        stroke="var(--color-border)"
        strokeWidth={1}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Miss (no score)"
        className={cn("cursor-pointer", SVG_FOCUS)}
        onClick={() => !disabled && onThrow({ segment: 0, multiple: 1 })}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Variant 0 — Current (baseline)
// ---------------------------------------------------------------------------

/**
 * Today's board, reproduced through the shared renderer: three equal-width
 * 44px bands, singles innermost. Here so the others can be judged against
 * it rather than against memory — flip 0 ↔ A and the difference is the
 * whole question.
 *
 * Deliberately keeps the *current* focus behaviour (no `outline-none`, no
 * focus-visible styling) so the reported lingering-outline artefact is
 * visible on this variant and gone on the rest.
 */
export function VariantCurrent(props: ScoringInputProps) {
  return (
    <div className="[&_path]:outline-auto [&_circle]:outline-auto">
      <BoardShape
        {...props}
        bands={[
          { multiple: 1, r1: R_25, r2: 102 },
          { multiple: 2, r1: 102, r2: 146 },
          { multiple: 3, r1: 146, r2: 190 },
        ]}
        labelRadius={202}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variant A — Fat singles, board order unchanged
// ---------------------------------------------------------------------------

/**
 * The minimal-change answer: keep singles innermost, just stop giving the
 * three bands equal width. Singles take 90 of the 132 available radial px;
 * double and treble get 21 each, which they can afford because they sit at a
 * larger radius where the arc is longer.
 *
 * The bet: the ring order is muscle memory worth preserving, and width alone
 * is enough. The risk: double and treble become thin enough to mis-tap, and
 * doubles are what you check out on.
 */
export function VariantFatSingles(props: ScoringInputProps) {
  return (
    <BoardShape
      {...props}
      bands={[
        { multiple: 1, r1: R_25, r2: 148 },
        { multiple: 2, r1: 148, r2: 169 },
        { multiple: 3, r1: 169, r2: 190 },
      ]}
      labelRadius={202}
    />
  );
}

// ---------------------------------------------------------------------------
// Variant B — Singles moved to the outer band
// ---------------------------------------------------------------------------

/**
 * The geometric answer: arc length grows with radius, so put the most-thrown
 * target where the circle is widest. Order inward-to-outward becomes treble,
 * double, single — singles get a 56px band at the largest radius, the biggest
 * target of any board variant, without starving double or treble (38px each,
 * both wider than variant A gives them).
 *
 * The bet: nobody actually navigates this board by real-dartboard memory —
 * the current ring order isn't a real board's either (a real board is
 * single/treble/single/double outward), so there is no fidelity to protect.
 * The risk: the numbers now label the ring they sit next to, and the outer
 * ring reading as "single" may fight what the eye expects.
 */
export function VariantSinglesOutside(props: ScoringInputProps) {
  return (
    <BoardShape
      {...props}
      bands={[
        { multiple: 3, r1: R_25, r2: 96 },
        { multiple: 2, r1: 96, r2: 134 },
        { multiple: 1, r1: 134, r2: 190 },
      ]}
      labelRadius={202}
    />
  );
}

// ---------------------------------------------------------------------------
// Variant C — Grid with a sticky multiplier
// ---------------------------------------------------------------------------

/**
 * Not a board at all. A 4×5 grid of the twenty numbers in *numeric* order
 * (you read a number, you don't aim at it), with a segmented S/D/T control
 * above it. Every number is a full-size touch target regardless of what
 * multiplier is armed.
 *
 * The multiplier resets to Single after every throw, on the reasoning that
 * singles dominate and a sticky treble is a silent mis-scoring waiting to
 * happen. That reset is the main thing to feel out: it costs a tap on
 * three-treble turns.
 */
export function VariantGrid({
  disabled,
  checkoutTarget,
  onThrow,
}: ScoringInputProps) {
  const [multiple, setMultiple] = useState<1 | 2 | 3>(1);

  function throwDart(dart: ThrownDart) {
    if (disabled) return;
    onThrow(dart);
    setMultiple(1);
  }

  const armedColour =
    multiple === 2 ? DOUBLE_FILL : multiple === 3 ? TREBLE_FILL : undefined;

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
                        m === 2
                          ? DOUBLE_FILL
                          : m === 3
                            ? TREBLE_FILL
                            : "var(--color-foreground)",
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
          return (
            <button
              key={segment}
              type="button"
              disabled={disabled}
              aria-label={`${multiplierName(multiple)} ${segment}`}
              onClick={() => throwDart({ segment, multiple })}
              className={cn(
                "flex h-14 flex-col items-center justify-center rounded-xl border border-border bg-card text-xl font-black tabular-nums transition-colors active:brightness-90",
                HTML_FOCUS,
                glow && "animate-pulse border-2 border-c-pink",
              )}
              style={armedColour ? { color: armedColour } : undefined}
            >
              {segment}
              {multiple > 1 && (
                <span className="text-[10px] font-bold opacity-70">
                  {segment * multiple}
                </span>
              )}
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
// Variant D — Number first, then multiplier
// ---------------------------------------------------------------------------

/**
 * Two taps, always, for a numbered segment: pick the number from a big pad,
 * then pick single / double / treble from three targets that fill the same
 * space. Nothing is ever small, and the multiplier can't be silently left
 * armed from the previous dart, because it is asked fresh every time.
 *
 * Bull, 25 and Miss resolve on one tap — they have no multiplier.
 *
 * The bet: for the most-thrown target the tap cost is what kills it. Feel
 * whether "20, single" twice a turn is annoying enough to lose to variant C's
 * one-tap-plus-occasional-modifier.
 */
export function VariantTwoStep({
  disabled,
  checkoutTarget,
  onThrow,
}: ScoringInputProps) {
  const [pendingSegment, setPendingSegment] = useState<number | null>(null);

  function throwDart(dart: ThrownDart) {
    if (disabled) return;
    onThrow(dart);
    setPendingSegment(null);
  }

  if (pendingSegment !== null) {
    return (
      <div className={cn("flex flex-col gap-2", disabled && "opacity-60")}>
        <div className="flex items-baseline justify-between px-1">
          <p className="text-sm font-bold">
            <span className="text-3xl font-black tabular-nums">
              {pendingSegment}
            </span>
            <span className="ml-2 text-muted-foreground">— how many?</span>
          </p>
          <button
            type="button"
            onClick={() => setPendingSegment(null)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-bold text-muted-foreground underline",
              HTML_FOCUS,
            )}
          >
            Cancel
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([1, 2, 3] as const).map((m) => {
            const glow = isTarget(checkoutTarget, pendingSegment, m);
            return (
              <button
                key={m}
                type="button"
                disabled={disabled}
                aria-label={`${multiplierName(m)} ${pendingSegment}`}
                onClick={() =>
                  throwDart({ segment: pendingSegment, multiple: m })
                }
                className={cn(
                  "flex h-32 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-transparent text-background transition-transform active:scale-95",
                  HTML_FOCUS,
                  glow && "animate-pulse border-c-pink",
                )}
                style={{
                  backgroundColor:
                    m === 2
                      ? DOUBLE_FILL
                      : m === 3
                        ? TREBLE_FILL
                        : "var(--color-foreground)",
                }}
              >
                <span className="text-xs font-black tracking-widest uppercase">
                  {multiplierName(m)}
                </span>
                <span className="text-3xl font-black tabular-nums">
                  {dartValue({ segment: pendingSegment, multiple: m })}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", disabled && "opacity-60")}>
      <div className="grid grid-cols-4 gap-2">
        {NUMERIC_ORDER.map((segment) => {
          // Any multiplier of this number finishing the leg is worth flagging
          // before the number is even chosen — otherwise the glow can only
          // appear on the second screen, which is too late to aim by.
          const glow =
            checkoutTarget !== null && checkoutTarget.segment === segment;
          return (
            <button
              key={segment}
              type="button"
              disabled={disabled}
              aria-label={`Number ${segment}`}
              onClick={() => setPendingSegment(segment)}
              className={cn(
                "h-16 rounded-xl border border-border bg-card text-2xl font-black tabular-nums transition-transform active:scale-95",
                HTML_FOCUS,
                glow && "animate-pulse border-2 border-c-pink",
              )}
            >
              {segment}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-2">
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

export const SCORING_VARIANTS = [
  {
    key: "0",
    name: "Current (baseline)",
    Component: VariantCurrent,
    note: "Three equal 44px rings, singles innermost. Focus styling deliberately left as-is so the browser's default outline is visible on tap.",
  },
  {
    key: "A",
    name: "Fat singles",
    Component: VariantFatSingles,
    note: "Same ring order, unequal widths — singles 90px, double and treble 21px each.",
  },
  {
    key: "B",
    name: "Singles outside",
    Component: VariantSinglesOutside,
    note: "Order flipped to treble / double / single outward, so singles sit where the arc is longest.",
  },
  {
    key: "C",
    name: "Grid + sticky multiplier",
    Component: VariantGrid,
    note: "20-key numeric grid, S/D/T armed above it, resets to Single after each dart.",
  },
  {
    key: "D",
    name: "Number first, then multiplier",
    Component: VariantTwoStep,
    note: "Always two taps for a numbered segment; every target is large.",
  },
] as const;
