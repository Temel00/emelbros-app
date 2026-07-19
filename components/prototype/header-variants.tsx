/**
 * PROTOTYPE (#68) — throwaway. **Round three.**
 *
 * Round one settled the *shape*: single-line multicoloured live-text wordmark
 * with an initial avatar. Round two ran six colourings of it; the owner picked
 * **Cycle** (four brights, twice through, no symmetry) as the favourite, and
 * asked for the **inverse of Tail** — colour on "emel", neutral on "bros".
 *
 * Round three explores only those two ideas. Two families:
 *
 * - **Head** (A–D) — "emel" carries the brights, "bros" goes neutral.
 * - **Cycle** (E–F) — the round-two favourite, plus one hybrid.
 *
 * A note on "white": the owner asked for a white "bros". White is only white
 * on the *dark* ground — on the light ground `--background` is `#f5f6f7`, so a
 * literally-white "bros" is invisible. A and B are therefore the same idea
 * twice: A reads "white" as the theme-aware ink token (dark on light, near-
 * white on dark), B takes it literally so the light-mode failure is visible
 * rather than argued about.
 *
 * Still sized with **container queries**, not viewport breakpoints, so the
 * same component renders as the live sticky header *and* inside the
 * fixed-width breakpoint strip further down the page.
 */

import Link from "next/link";

import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ACCENT_BG, type MemberAccent } from "@/lib/accent";
import { cn } from "@/lib/utils";

export type VariantKey = "A" | "B" | "C" | "D" | "E" | "F";

type VariantProps = { accent: MemberAccent; displayName: string };

const SHELL =
  "@container mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 sm:px-6";

const WORD = "emelbros";

const PINK = "var(--c-pink)";
const YELLOW = "var(--c-yellow)";
const GREEN = "var(--c-green)";
const BLUE = "var(--c-blue)";
/** Body ink — the neutral that carries ~90% of every surface (#18). */
const INK = "var(--foreground)";
/** Softer than ink — deliberate hierarchy rather than equal weight. */
const MUTED = "var(--muted-foreground)";
/** Literally white, on both grounds. Only legible on the dark one. */
const WHITE = "#ffffff";

/** A bright, faded toward the ground — used for the half-strength tail. */
const fade = (color: string, pct: number) =>
  `color-mix(in oklab, ${color} ${pct}%, var(--background))`;

/**
 * One colour per letter of "emelbros". Eight entries, always — the schemes
 * differ only in how many of them are brights.
 */
type Scheme = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

const SCHEMES: Record<
  VariantKey,
  { name: string; note: string; colors: Scheme }
> = {
  /**
   * The requested inverse of Tail, read theme-aware: brights on "emel",
   * "bros" in the ink token — near-white on the dark ground, dark on the
   * light one. This is "white bros" as it actually has to be implemented
   * if the header is to work in both themes.
   */
  A: {
    name: "Head — bright 'emel', ink 'bros'",
    note: "The inverse of Tail. Colour leads, the name lands. 'bros' uses the ink token, so it is near-white on dark and dark on light — the only reading of 'white' that survives both themes.",
    colors: [PINK, YELLOW, GREEN, BLUE, INK, INK, INK, INK],
  },

  /**
   * The same idea taken literally — a white "bros" on both grounds. Included
   * precisely so the light-mode failure is visible rather than described.
   */
  B: {
    name: "Head — bright 'emel', literally white 'bros'",
    note: "'white' taken at face value. Look at this one on the light ground: 'bros' is #ffffff on a #f5f6f7 background, so half the wordmark disappears. Dark mode is exactly what you were picturing.",
    colors: [PINK, YELLOW, GREEN, BLUE, WHITE, WHITE, WHITE, WHITE],
  },

  /**
   * Head, but the tail steps back rather than matching body text — so the
   * colour clearly leads and "bros" reads as a second beat.
   */
  C: {
    name: "Head — bright 'emel', muted 'bros'",
    note: "Same shape as A, but 'bros' drops to the muted token instead of full ink. Gives the lockup a clear front and back rather than two equal halves.",
    colors: [PINK, YELLOW, GREEN, BLUE, MUTED, MUTED, MUTED, MUTED],
  },

  /**
   * Head with yellow removed. #66 measured yellow at 1.33:1 on the light
   * ground, and in every Head scheme it lands on the "m" — right in the
   * middle of the coloured half. This is the version that survives light
   * mode without touching the palette tokens.
   */
  D: {
    name: "Head — no yellow, ink 'bros'",
    note: "A, minus the letter that vanishes. Yellow is 1.33:1 on the light ground, and in Head it always lands on the 'm'. Here 'emel' runs pink-green-blue-pink instead. Cheapest fix that needs no palette change.",
    colors: [PINK, GREEN, BLUE, PINK, INK, INK, INK, INK],
  },

  /**
   * Round two's favourite, carried forward unchanged as the baseline the
   * Head family is being judged against.
   */
  E: {
    name: "Cycle — four brights, twice through (round-two favourite)",
    note: "Unchanged from round two, here as the baseline. Four brights cycling with no symmetry; the eye reads left-to-right motion. Still carries the light-mode yellow problem on the 'm' and the 'r'.",
    colors: [PINK, YELLOW, GREEN, BLUE, PINK, YELLOW, GREEN, BLUE],
  },

  /**
   * The hybrid: the full cycle is kept, but the second pass is faded toward
   * the ground — so "emel" still leads without "bros" going fully neutral.
   */
  F: {
    name: "Cycle — full brights, faded 'bros'",
    note: "Bridges the two you liked. The whole word keeps the cycle, but 'bros' runs at half strength toward the ground, so colour still leads without the tail going flat neutral.",
    colors: [
      PINK,
      YELLOW,
      GREEN,
      BLUE,
      fade(PINK, 45),
      fade(YELLOW, 45),
      fade(GREEN, 45),
      fade(BLUE, 45),
    ],
  },
};

/** The single-line live-text wordmark, coloured per letter. */
function TextWordmark({ colors }: { colors: readonly string[] }) {
  return (
    <Link
      href="/"
      aria-label="Emelbros"
      className="font-brand text-2xl leading-none @max-[380px]:text-xl"
    >
      {WORD.split("").map((char, i) => (
        <span key={i} aria-hidden style={{ color: colors[i] }}>
          {char}
        </span>
      ))}
    </Link>
  );
}

/**
 * D's avatar, promoted from round one: the member's accent as a filled
 * circle carrying the first letter of their display name. Replaces the bare
 * identity dot — it reads as *a person*, not *a colour*.
 *
 * NOTE: this needs a display name, which `profiles` does not carry yet —
 * that is exactly what #72 (member directory) decides. Until then the
 * initial has nothing real to come from.
 */
function InitialAvatar({
  accent,
  displayName,
}: {
  accent: MemberAccent;
  displayName: string;
}) {
  return (
    <span
      title={displayName}
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full text-xs font-extrabold text-white",
        ACCENT_BG[accent],
      )}
    >
      {displayName.charAt(0).toUpperCase()}
    </span>
  );
}

function makeVariant(key: VariantKey) {
  return function Variant({ accent, displayName }: VariantProps) {
    const colors = SCHEMES[key].colors;

    return (
      <div className={cn(SHELL, "py-3")}>
        <nav aria-label="Primary">
          <TextWordmark colors={colors} />
        </nav>
        <div className="flex items-center gap-2">
          <InitialAvatar accent={accent} displayName={displayName} />
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>
    );
  };
}

export const VARIANTS: Record<
  VariantKey,
  {
    name: string;
    note: string;
    render: (props: VariantProps) => React.ReactNode;
  }
> = Object.fromEntries(
  (Object.keys(SCHEMES) as VariantKey[]).map((key) => [
    key,
    {
      name: SCHEMES[key].name,
      note: SCHEMES[key].note,
      render: makeVariant(key),
    },
  ]),
) as Record<
  VariantKey,
  {
    name: string;
    note: string;
    render: (props: VariantProps) => React.ReactNode;
  }
>;

export const VARIANT_KEYS = Object.keys(VARIANTS) as VariantKey[];

export function isVariantKey(value: string | undefined): value is VariantKey {
  return !!value && value in VARIANTS;
}
