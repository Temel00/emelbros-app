"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #187 resolves.
 *
 * Answers #187: subtle or bold for the Nutrition background flair, and the
 * mechanics the winner implies (tinting / composition / attach point). Reacted
 * to in-app across shopping-list, recipes and overview, in light AND dark.
 *
 * Deliberate prototype shortcuts, to be swapped when the treatment is folded
 * into real code (all called out in the #187 resolution):
 * - Vectors are Lucide (already a dep) — the #186-verified fallback slugs — NOT
 *   the game-icons.net silhouettes #186 settled on. Lucide is stroke-only, so
 *   "bold" reads as heavier outlines rather than filled silhouettes; the
 *   loudness/legibility judgement still transfers. Final art swaps in the
 *   game-icons produce set + per-screen objects.
 * - Tinting is demonstrated the `currentColor` way: each icon is a single-fill
 *   vector coloured by a `text-c-*` bright token (theme-aware, from #18). That
 *   is one of the mechanics the ticket asks to settle.
 * - Composition is a fixed scattered field (one shared produce backdrop + 1–2
 *   screen accents), not a tiled pattern or a decorative frame. The other
 *   candidate compositions are named in the resolution for the owner to weigh.
 *
 * The layer is `aria-hidden` + `pointer-events-none` and sits at `-z-10` inside
 * the nutrition layout's `isolate` context, so it paints above the app
 * background but behind all content (WCAG-AA body-text contrast is the hard
 * guardrail the winner must clear — judge it live, especially in "bold").
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
  Egg,
  Fish,
  Grape,
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

export type FlairVariant = "none" | "subtle" | "bold";

// The four #18 brights, as theme-aware token classes. Icons colour via
// `currentColor`, so tinting is just a text-colour class — the "single-fill /
// currentColor" mechanic the ticket asks about.
const BRIGHTS = ["text-c-green", "text-c-yellow", "text-c-blue", "text-c-pink"];

type Placed = {
  Icon: LucideIcon;
  /** % from top / left of the viewport-height layer */
  top: number;
  left: number;
  /** rem size */
  size: number;
  rotate: number;
  tint: string;
};

// One shared produce backdrop, scattered across the whole layer. Same field on
// every screen (the #186 decision: a shared produce backdrop everywhere).
const PRODUCE: Array<Omit<Placed, "tint">> = [
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

// 1–2 screen-specific accent objects, placed prominently, keyed by pathname.
// Slugs track #186's per-screen vocabulary (Lucide fallbacks stand in for the
// game-icons objects).
const ACCENTS: Record<string, Array<Omit<Placed, "tint">>> = {
  "/nutrition": [
    { Icon: Refrigerator, top: 18, left: 40, size: 12, rotate: -6 },
    { Icon: Package, top: 66, left: 58, size: 10, rotate: 8 },
  ],
  "/nutrition/recipes": [
    { Icon: BookOpen, top: 20, left: 44, size: 13, rotate: -5 },
    { Icon: NotebookText, top: 68, left: 20, size: 10, rotate: 10 },
  ],
  "/nutrition/plan": [
    { Icon: CalendarDays, top: 18, left: 38, size: 12, rotate: -6 },
    { Icon: Utensils, top: 70, left: 64, size: 10, rotate: 12 },
  ],
  "/nutrition/shopping-list": [
    { Icon: ShoppingBasket, top: 20, left: 42, size: 13, rotate: -7 },
    { Icon: ShoppingCart, top: 66, left: 22, size: 11, rotate: 9 },
  ],
  "/nutrition/log": [
    { Icon: ClipboardList, top: 18, left: 40, size: 12, rotate: -5 },
    { Icon: Utensils, top: 72, left: 66, size: 10, rotate: 11 },
  ],
  "/nutrition/overview": [
    { Icon: ChartColumn, top: 20, left: 44, size: 12, rotate: -4 },
    { Icon: Target, top: 68, left: 24, size: 11, rotate: 8 },
  ],
  "/nutrition/settings": [
    { Icon: Settings, top: 20, left: 42, size: 12, rotate: -6 },
    { Icon: SlidersHorizontal, top: 70, left: 64, size: 10, rotate: 10 },
  ],
};

function accentsFor(pathname: string) {
  // recipes/[id] and any deeper leaf falls back to the recipes accents.
  if (pathname.startsWith("/nutrition/recipes"))
    return ACCENTS["/nutrition/recipes"];
  return ACCENTS[pathname] ?? [];
}

function tint(i: number) {
  return BRIGHTS[i % BRIGHTS.length];
}

export function PrototypeFlairBackground() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const variant = (searchParams.get("variant") as FlairVariant) ?? "none";

  if (variant === "none") return null;

  const bold = variant === "bold";

  // Loudness knobs. Dark gets a touch more opacity because the brights are
  // nudged lighter/cooler there and read fainter over the dark ground.
  const backdropOpacity = bold
    ? "opacity-[0.16] dark:opacity-[0.22]"
    : "opacity-[0.05] dark:opacity-[0.08]";
  const accentOpacity = bold
    ? "opacity-[0.22] dark:opacity-[0.28]"
    : "opacity-[0.07] dark:opacity-[0.10]";
  const stroke = bold ? 1.75 : 1.5;

  const produce = PRODUCE.map((p, i) => ({ ...p, tint: tint(i) }));
  const accents = accentsFor(pathname).map((a, i) => ({
    ...a,
    // Bold accents lean on pink/blue for weight; subtle keeps them muted-neutral.
    tint: bold ? tint(i + 3) : "text-muted-foreground",
  }));

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* Bold adds a faint tinted wash band behind the field, as a sanctioned
          module-level decorative layer (the #18 exception the ticket flags). */}
      {bold && (
        <div className="absolute inset-0 bg-gradient-to-br from-c-green/[0.06] via-transparent to-c-pink/[0.06] dark:from-c-green/[0.10] dark:to-c-pink/[0.10]" />
      )}

      {produce.map(({ Icon, top, left, size, rotate, tint }, i) => (
        <Icon
          key={`p-${i}`}
          className={`absolute ${tint} ${backdropOpacity}`}
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

      {accents.map(({ Icon, top, left, size, rotate, tint }, i) => (
        <Icon
          key={`a-${i}`}
          className={`absolute ${tint} ${accentOpacity}`}
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
    </div>
  );
}
