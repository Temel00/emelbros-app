/**
 * PROTOTYPE (#68) — throwaway. Four structurally different answers to
 * "what does the real logo look like in the app header, at every breakpoint".
 *
 * Every variant is sized with **container queries**, not viewport breakpoints,
 * so the exact same component can be rendered as the real sticky header *and*
 * inside the fixed-width breakpoint strip further down the page. That is the
 * only way to see the 320px crowding without resizing the browser.
 *
 * Each variant also takes a different position on the accent identity dot,
 * because that question can't be answered independently of the mark.
 */

import Link from "next/link";

import { Glyph, Wordmark } from "@/components/prototype/brand-marks";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ACCENT_BG, type MemberAccent } from "@/lib/accent";
import { cn } from "@/lib/utils";

export type VariantKey = "A" | "B" | "C" | "D";

type VariantProps = { accent: MemberAccent };

const SHELL =
  "@container mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 sm:px-6";

/**
 * A — Glyph + live wordmark text.
 * The mark carries the brand, the name stays selectable text in the loaded
 * Bagel Fat One. Below ~380px the text drops and the glyph stands alone.
 * Accent dot: kept as-is, so its competition with a pink mark is visible.
 */
function VariantA({ accent }: VariantProps) {
  return (
    <div className={cn(SHELL, "py-3")}>
      <nav aria-label="Primary">
        <Link href="/" className="flex items-center gap-2">
          <Glyph className="h-6 w-auto shrink-0" />
          <span className="font-brand text-xl text-primary @max-[380px]:hidden">
            Emelbros
          </span>
        </Link>
      </nav>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn("size-5 shrink-0 rounded-full", ACCENT_BG[accent])}
        />
        <ThemeToggle />
        <SignOutButton />
      </div>
    </div>
  );
}

/**
 * B — The real artwork, header grows to fit it.
 * The handed-over two-line lockup at ~32px tall (#66 measured 28px as the
 * floor). Costs vertical space on a sticky header, which is the trade to
 * judge. Accent dot demoted to a small tick so it stops competing.
 */
function VariantB({ accent }: VariantProps) {
  return (
    <div className={cn(SHELL, "py-2")}>
      <nav aria-label="Primary">
        <Link href="/" className="block">
          <Wordmark className="h-9 w-auto @max-[380px]:h-7" />
        </Link>
      </nav>
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className={cn("size-2.5 shrink-0 rounded-full", ACCENT_BG[accent])}
        />
        <ThemeToggle />
        <SignOutButton />
      </div>
    </div>
  );
}

/**
 * C — No asset at all: the four brights carried by live text.
 * Zero extra requests, fully selectable, scales to any size. The lockup's
 * colour order flattened to one line (pink-yellow-green-blue-blue-green-
 * yellow-pink). Accent dot dropped — the wordmark already spends all four
 * brights, so a fifth coloured circle is noise.
 */
const LETTERS = [
  ["e", "var(--c-pink)"],
  ["m", "var(--c-yellow)"],
  ["e", "var(--c-green)"],
  ["l", "var(--c-blue)"],
  ["b", "var(--c-blue)"],
  ["r", "var(--c-green)"],
  ["o", "var(--c-yellow)"],
  ["s", "var(--c-pink)"],
] as const;

function VariantC() {
  return (
    <div className={cn(SHELL, "py-3")}>
      <nav aria-label="Primary">
        <Link
          href="/"
          aria-label="Emelbros"
          className="font-brand text-2xl leading-none @max-[380px]:text-xl"
        >
          {LETTERS.map(([char, color], i) => (
            <span key={i} aria-hidden style={{ color }}>
              {char}
            </span>
          ))}
        </Link>
      </nav>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <SignOutButton />
      </div>
    </div>
  );
}

/**
 * D — Glyph only, always; wordmark reserved for the sign-in front door.
 * Buys back the horizontal room that cross-module nav (#71) will need, and
 * the accent becomes a real avatar rather than a decorative dot.
 */
function VariantD({ accent }: VariantProps) {
  return (
    <div className={cn(SHELL, "py-2.5")}>
      <nav aria-label="Primary" className="flex items-center gap-4">
        <Link href="/" aria-label="Emelbros">
          <Glyph className="h-7 w-auto shrink-0" />
        </Link>
        <span className="flex items-center gap-3 text-sm font-bold @max-[440px]:hidden">
          <span className="text-foreground">Darts</span>
          <span className="text-muted-foreground">Lists</span>
          <span className="text-muted-foreground">Habits</span>
        </span>
      </nav>
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-full text-xs font-extrabold text-white",
            ACCENT_BG[accent],
          )}
        >
          T
        </span>
        <ThemeToggle />
        <SignOutButton />
      </div>
    </div>
  );
}

export const VARIANTS: Record<
  VariantKey,
  { name: string; render: (props: VariantProps) => React.ReactNode }
> = {
  A: { name: "Glyph + live wordmark text", render: VariantA },
  B: { name: "Real two-line artwork, taller header", render: VariantB },
  C: { name: "No asset — four-bright live text", render: VariantC },
  D: { name: "Glyph only, wordmark reserved", render: VariantD },
};

export const VARIANT_KEYS = Object.keys(VARIANTS) as VariantKey[];

export function isVariantKey(value: string | undefined): value is VariantKey {
  return !!value && value in VARIANTS;
}
