"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #187 resolves.
 *
 * Answers #187: what treatment for the Nutrition background flair, and the
 * mechanics the winner implies. Reacted to in-app across shopping-list,
 * recipes and overview, in light AND dark.
 *
 * ROUND 2 (after the owner's round-1 reaction):
 * - Round 1 was none / subtle / bold. Subtle won the bunch; the bold gradient
 *   wash was disliked and is dropped.
 * - `subtle` is kept unchanged as the reference / current leader.
 * - `dense` iterates on subtle per the ask: smaller icons, many more of them,
 *   a little more opaque, so the four-bright colour theme actually reads.
 * - `wildcard` is a deliberate departure from everything discussed so far: one
 *   oversized, corner-cropped, screen-defining object as a watermark (one big
 *   shape instead of a scattered field), to see if a different direction lands.
 *
 * Deliberate prototype shortcuts, unchanged from round 1 (called out in #187):
 * - Vectors are Lucide (the #186-verified fallback slugs), NOT the
 *   game-icons.net silhouettes #186 settled on. Lucide is stroke-only; the
 *   loudness/legibility/composition judgement still transfers. Final art swaps
 *   in the game-icons produce set + per-screen objects.
 * - Tinting is the `currentColor` way: each icon is a single-fill vector
 *   coloured by a theme-aware `text-c-*` bright token (#18).
 *
 * The layer is `aria-hidden` + `pointer-events-none` and sits at `-z-10` inside
 * the nutrition layout's `isolate` context: above the app background, behind
 * all content. WCAG-AA body-text contrast is the hard guardrail the winner
 * must clear — judge it live.
 */

import {
  Apple,
  BookOpen,
  Carrot,
  CalendarDays,
  ChartColumn,
  Cherry,
  Citrus,
  ClipboardList,
  CookingPot,
  Croissant,
  Egg,
  Fish,
  Grape,
  Milk,
  NotebookText,
  Package,
  Refrigerator,
  Salad,
  Settings,
  ShoppingBasket,
  ShoppingCart,
  SlidersHorizontal,
  Soup,
  Target,
  Utensils,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

export type FlairVariant = "none" | "subtle" | "dense" | "wildcard";

// The four #18 brights, as theme-aware token classes. Icons colour via
// `currentColor`, so tinting is just a text-colour class.
const BRIGHTS = ["text-c-green", "text-c-yellow", "text-c-blue", "text-c-pink"];

function tint(i: number) {
  return BRIGHTS[i % BRIGHTS.length];
}

type Placed = {
  Icon: LucideIcon;
  /** % from top / left of the layer */
  top: number;
  left: number;
  /** rem size */
  size: number;
  rotate: number;
};

// ---------------------------------------------------------------------------
// subtle (round-1 leader, unchanged): one sparse produce backdrop, big + faint.
// ---------------------------------------------------------------------------
const SUBTLE_PRODUCE: Placed[] = [
  { Icon: Carrot, top: 6, left: 8, size: 7, rotate: -18 },
  { Icon: Apple, top: 14, left: 78, size: 8, rotate: 12 },
  { Icon: Grape, top: 30, left: 22, size: 6.5, rotate: 8 },
  { Icon: Wheat, top: 40, left: 88, size: 9, rotate: -10 },
  { Icon: Cherry, top: 52, left: 12, size: 6, rotate: 16 },
  { Icon: Citrus, top: 62, left: 70, size: 7.5, rotate: -6 },
  { Icon: Salad, top: 74, left: 30, size: 8, rotate: 10 },
  { Icon: Egg, top: 84, left: 84, size: 6, rotate: -14 },
  { Icon: Fish, top: 90, left: 46, size: 8.5, rotate: 6 },
  { Icon: Soup, top: 22, left: 50, size: 7, rotate: -4 },
];

// ---------------------------------------------------------------------------
// dense: smaller, many more, a little more opaque so the palette reads. Field
// generated once at module scope with a fixed seed so server/client agree.
// ---------------------------------------------------------------------------
const DENSE_POOL: LucideIcon[] = [
  Carrot,
  Apple,
  Grape,
  Wheat,
  Cherry,
  Citrus,
  Salad,
  Egg,
  Fish,
  Soup,
  Milk,
  Croissant,
  CookingPot,
];

const DENSE_PRODUCE: Placed[] = (() => {
  // Tiny deterministic LCG — prototype-cheap, stable across renders.
  let s = 20250923;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const items: Placed[] = [];
  // ~7 columns x 5 rows of jittered cells → a fuller, even scatter.
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 7; col++) {
      items.push({
        Icon: DENSE_POOL[(row * 7 + col) % DENSE_POOL.length],
        top: 4 + row * 19 + (rnd() * 10 - 5),
        left: 3 + col * 14 + (rnd() * 8 - 4),
        size: 2.4 + rnd() * 1.6,
        rotate: rnd() * 60 - 30,
      });
    }
  }
  return items;
})();

// ---------------------------------------------------------------------------
// Per-screen accent objects (slugs track #186's vocabulary; Lucide fallbacks).
// [0] is the screen-defining "hero" used by the wildcard watermark.
// ---------------------------------------------------------------------------
const ACCENTS: Record<string, LucideIcon[]> = {
  "/nutrition": [Refrigerator, Package],
  "/nutrition/recipes": [BookOpen, NotebookText],
  "/nutrition/plan": [CalendarDays, Utensils],
  "/nutrition/shopping-list": [ShoppingBasket, ShoppingCart],
  "/nutrition/log": [ClipboardList, Utensils],
  "/nutrition/overview": [ChartColumn, Target],
  "/nutrition/settings": [Settings, SlidersHorizontal],
};

function accentsFor(pathname: string): LucideIcon[] {
  if (pathname.startsWith("/nutrition/recipes"))
    return ACCENTS["/nutrition/recipes"];
  return ACCENTS[pathname] ?? ACCENTS["/nutrition"];
}

function Field({
  items,
  opacity,
  stroke,
}: {
  items: Array<Placed & { tint: string }>;
  opacity: string;
  stroke: number;
}) {
  return (
    <>
      {items.map(({ Icon, top, left, size, rotate, tint }, i) => (
        <Icon
          key={i}
          className={`absolute ${tint} ${opacity}`}
          strokeWidth={stroke}
          style={{
            top: `${top}%`,
            left: `${left}%`,
            width: `${size}rem`,
            height: `${size}rem`,
            transform: `rotate(${rotate}deg)`,
          }}
        />
      ))}
    </>
  );
}

export function PrototypeFlairBackground() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const variant = (searchParams.get("variant") as FlairVariant) ?? "none";

  if (variant === "none") return null;

  const accents = accentsFor(pathname);

  let body: React.ReactNode = null;

  if (variant === "subtle") {
    // Sparse, faint, big — the round-1 leader.
    body = (
      <>
        <Field
          items={SUBTLE_PRODUCE.map((p, i) => ({ ...p, tint: tint(i) }))}
          opacity="opacity-[0.05] dark:opacity-[0.08]"
          stroke={1.5}
        />
        {accents.slice(0, 2).map((Icon, i) => (
          <Icon
            key={i}
            className="absolute text-muted-foreground opacity-[0.07] dark:opacity-[0.10]"
            strokeWidth={1.5}
            style={{
              top: i === 0 ? "20%" : "68%",
              left: i === 0 ? "42%" : "24%",
              width: "11rem",
              height: "11rem",
              transform: `rotate(${i === 0 ? -6 : 9}deg)`,
            }}
          />
        ))}
      </>
    );
  } else if (variant === "dense") {
    // Smaller, many more, a little more opaque — the palette reads as a set.
    body = (
      <>
        <Field
          items={DENSE_PRODUCE.map((p, i) => ({ ...p, tint: tint(i) }))}
          opacity="opacity-[0.10] dark:opacity-[0.14]"
          stroke={1.75}
        />
        {/* The two screen accents, also small, mixed into the confetti. */}
        {accents.slice(0, 2).map((Icon, i) => (
          <Icon
            key={i}
            className={`absolute ${tint(i + 2)} opacity-[0.13] dark:opacity-[0.18]`}
            strokeWidth={1.75}
            style={{
              top: i === 0 ? "34%" : "58%",
              left: i === 0 ? "46%" : "40%",
              width: "3.4rem",
              height: "3.4rem",
              transform: `rotate(${i === 0 ? -8 : 10}deg)`,
            }}
          />
        ))}
      </>
    );
  } else if (variant === "wildcard") {
    // Departure: one oversized, corner-cropped, screen-defining watermark +
    // a second big shape off the opposite corner. One statement, not a field.
    const Hero = accents[0];
    const Echo = accents[1] ?? accents[0];
    body = (
      <>
        <Hero
          aria-hidden
          className="absolute text-c-green opacity-[0.08] dark:opacity-[0.13]"
          strokeWidth={1.25}
          style={{
            top: "-8rem",
            right: "-9rem",
            left: "auto",
            width: "34rem",
            height: "34rem",
            transform: "rotate(-12deg)",
          }}
        />
        <Echo
          aria-hidden
          className="absolute text-c-pink opacity-[0.06] dark:opacity-[0.10]"
          strokeWidth={1.25}
          style={{
            bottom: "-7rem",
            left: "-8rem",
            top: "auto",
            width: "26rem",
            height: "26rem",
            transform: "rotate(14deg)",
          }}
        />
      </>
    );
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {body}
    </div>
  );
}
