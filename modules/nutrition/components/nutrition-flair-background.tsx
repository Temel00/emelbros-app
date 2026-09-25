"use client";

import { usePathname } from "next/navigation";

import {
  FLAIR_ICONS,
  PRODUCE,
  SCREEN_ACCENTS,
  type FlairIcon,
} from "@/modules/nutrition/components/flair-icons";

/**
 * The Nutrition decorative flair layer (#187 → #189): a scattered field of
 * tinted game-icons produce with the active screen's accent objects woven in.
 *
 * Sanctioned by ADR-0018 as a guard-railed exception to the #18 colour
 * discipline — keep every guardrail: `aria-hidden` + `pointer-events-none`,
 * `opacity-[0.10]` / `dark:opacity-[0.14]` as a ceiling, `currentColor` tinting
 * through the theme-aware `text-c-*` brights only, and body text on an opaque
 * surface above it (never directly over the field).
 *
 * Rendered by `nutrition/layout.tsx` at `-z-10` inside its `isolate` context:
 * above the app background, behind all content.
 */

// The four #18 brights as theme-aware token classes; icons fill with
// `currentColor`, so tinting is just a text-colour class.
const BRIGHTS = ["text-c-green", "text-c-yellow", "text-c-blue", "text-c-pink"];

type Cell = { top: number; left: number; size: number; rotate: number };

// Geometry only — one jittered 7×5 grid, generated once with a fixed seed so
// server and client agree. Which icon lands in each cell is decided at render,
// so accents mix into the same grid rather than floating on a second layer.
const CELLS: Cell[] = (() => {
  let s = 20250923;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const cells: Cell[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 7; col++) {
      cells.push({
        top: 4 + row * 19 + (rnd() * 10 - 5),
        left: 3 + col * 14 + (rnd() * 8 - 4),
        size: 2.4 + rnd() * 1.6,
        rotate: rnd() * 60 - 30,
      });
    }
  }
  return cells;
})();

// Scattered, non-adjacent cells whose icon is a page accent instead of produce.
const ACCENT_SLOTS = new Set([4, 11, 17, 24, 30]);

function accentsFor(pathname: string): FlairIcon[] {
  // Recipe detail pages (`/nutrition/recipes/[id]`) share the recipes accents.
  if (pathname.startsWith("/nutrition/recipes"))
    return SCREEN_ACCENTS["/nutrition/recipes"];
  return SCREEN_ACCENTS[pathname] ?? SCREEN_ACCENTS["/nutrition"];
}

export function NutritionFlairBackground() {
  const accents = accentsFor(usePathname());

  let produceI = 0;
  let accentI = 0;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {CELLS.map(({ top, left, size, rotate }, i) => {
        const icon = ACCENT_SLOTS.has(i)
          ? accents[accentI++ % accents.length]
          : PRODUCE[produceI++ % PRODUCE.length];
        return (
          <svg
            key={i}
            viewBox="0 0 512 512"
            className={`absolute ${BRIGHTS[i % BRIGHTS.length]} opacity-[0.10] dark:opacity-[0.14]`}
            style={{
              top: `${top}%`,
              left: `${left}%`,
              width: `${size}rem`,
              height: `${size}rem`,
              transform: `rotate(${rotate}deg)`,
            }}
          >
            <path fill="currentColor" d={FLAIR_ICONS[icon]} />
          </svg>
        );
      })}
    </div>
  );
}
