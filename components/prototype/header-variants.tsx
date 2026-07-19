/**
 * PROTOTYPE (#68) — throwaway. **Round two.**
 *
 * Round one asked "what shape is the header lockup" across four structurally
 * different directions (A–D, see PR #80's first commit). The owner picked the
 * combination: **C's single-line multicoloured live-text wordmark** paired with
 * **D's initial avatar**. Round two holds that structure fixed and varies the
 * one thing still open — **which letters get which colour**.
 *
 * So every variant below is the same header. Only the colouring changes,
 * ranging from "all four brights, loud" to "no brights at all".
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
   * The artwork's own colouring, flattened. The two-line lockup runs
   * pink-yellow-green-blue across "emel" and blue-green-yellow-pink across
   * "bros", so laid out in one line it reads as a palindrome.
   */
  A: {
    name: "Mirror — the artwork's own order",
    note: "Exactly the colours #66's artwork already assigns, just on one line. Reads as a palindrome: pink at both ends, blue meeting in the middle.",
    colors: [PINK, YELLOW, GREEN, BLUE, BLUE, GREEN, YELLOW, PINK],
  },

  /**
   * The same four brights, but cycling rather than mirroring — so the
   * repeat lands on the "b" and the word feels like it has momentum
   * rather than symmetry.
   */
  B: {
    name: "Cycle — four brights, twice through",
    note: "Same palette, no symmetry. The eye reads left-to-right motion instead of a centre. Puts pink on 'e' and 'b', the two strongest letterforms.",
    colors: [PINK, YELLOW, GREEN, BLUE, PINK, YELLOW, GREEN, BLUE],
  },

  /**
   * Two solid blocks on the compound word. Much calmer — the colour
   * carries the word's structure rather than decorating each letter.
   */
  C: {
    name: "Syllable — 'emel' and 'bros' as blocks",
    note: "Colour as structure, not decoration: it says the name is two words. Only two brights spent, so the header stays quiet.",
    colors: [PINK, PINK, PINK, PINK, BLUE, BLUE, BLUE, BLUE],
  },

  /**
   * Ink-first: the name is body ink, with the brights confined to the
   * letters that bookend it. Keeps the header chrome neutral, which is
   * the stated colour discipline (#18: neutrals carry ~90%).
   */
  D: {
    name: "Bookends — ink with coloured ends",
    note: "Nearly all ink. Only the opening 'e' and closing 's' are bright, so the lockup hints at the palette without spending it. Most compatible with #18's 'neutrals carry 90%' rule.",
    colors: [PINK, INK, INK, INK, INK, INK, INK, BLUE],
  },

  /**
   * A middle position: the first word stays ink so the name reads as a
   * word first, then the second word runs the full palette.
   */
  E: {
    name: "Tail — ink 'emel', bright 'bros'",
    note: "Reads as a word first and a logo second. All four brights still appear, but only across half the lockup, so they don't fight the UI chrome beside them.",
    colors: [INK, INK, INK, INK, BLUE, GREEN, YELLOW, PINK],
  },

  /**
   * No brand brights at all — the wordmark takes the *signed-in member's*
   * accent. Makes the header personal rather than corporate, and echoes
   * the avatar sitting opposite it.
   */
  F: {
    name: "Member — wordmark takes your accent",
    note: "One colour, and it's yours — the wordmark matches the avatar across the header. Note this breaks #18's rule that the four brights only ever appear as a set for the brand signature.",
    colors: [INK, INK, INK, INK, INK, INK, INK, INK], // overridden at render
  },
};

const ACCENT_VAR: Record<MemberAccent, string> = {
  pink: PINK,
  yellow: YELLOW,
  green: GREEN,
  blue: BLUE,
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
    const scheme = SCHEMES[key];
    const colors =
      key === "F"
        ? (Array(8).fill(ACCENT_VAR[accent]) as unknown as Scheme)
        : scheme.colors;

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
