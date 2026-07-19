"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #70 resolves.
 *
 * Four directions for the branded sign-in front door, switchable via
 * `?variant=`. Built against the *current* `--c-*` tokens: the palette audit
 * (#69) is still open, so every colour here is provisional and any variant
 * that survives gets re-checked against whatever #69 rules canonical.
 *
 * Structural disagreements, not colour tweaks:
 *   A  brand is a small crest above a card        — neutrals carry it (#18 as written)
 *   B  brand *is* the page, full-bleed pink       — one bright, like the #67 icon tile
 *   C  the real two-line artwork at hero size     — the one screen with no size constraint
 *   D  asymmetric split, brand panel + sign-in    — warmth via copy, not scale
 *
 * None of them render AppHeader: it carries a sign-out button and a member
 * accent dot, neither of which exists for a signed-out visitor.
 */

import Image from "next/image";

import { Button } from "@/components/ui/button";

export type VariantProps = {
  onSignIn: () => void;
  isPending: boolean;
  error: string | null;
};

/** The mark-only `e`, recoloured via `currentColor` (public/brand/glyph.svg). */
function Glyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="23 -527 485 530"
      className={className}
      role="img"
      aria-label="Emelbros"
      fill="currentColor"
    >
      <path d="M23-260q0-79 31.5-139t90-94T284-527q63 0 113.5 23t79.5 61.5 29 84.5q0 48-28 68t-83 20H185q0 26 20.5 43t69.5 17q25 0 46.5-5t44-9.5T416-229q40 0 66 28.5t26 78.5q0 59-60.5 92T289 3q-69 0-129.5-27T61-109.5 23-260m165-43h159q15 0 10-14-4-14-24-29t-58-15q-44 0-65.5 19T188-303" />
    </svg>
  );
}

/**
 * Single-line live-text wordmark, four brights cycling — the lockup #68
 * settled on for the header. Reused here so the front door and the header
 * agree. NOTE: yellow is 1.33:1 on the light ground (#66), so the `l` is
 * effectively invisible in light mode until #69 fixes it.
 */
const CYCLE = [
  "text-c-pink",
  "text-c-yellow",
  "text-c-green",
  "text-c-blue",
] as const;

function LiveWordmark({ className }: { className?: string }) {
  return (
    <span className={`font-brand ${className ?? ""}`} aria-label="Emelbros">
      {"emelbros".split("").map((letter, i) => (
        <span key={i} aria-hidden className={CYCLE[i % CYCLE.length]}>
          {letter}
        </span>
      ))}
    </span>
  );
}

function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="text-destructive text-sm">{error}</p>;
}

/* ------------------------------------------------------------------ */
/* A — Quiet crest. #18 as written: neutrals carry ~90%, brand is a badge. */
/* ------------------------------------------------------------------ */

export function VariantA({ onSignIn, isPending, error }: VariantProps) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <Glyph className="mx-auto h-12 w-12 text-c-pink" />

        <div className="space-y-1.5">
          <h1 className="font-brand text-2xl text-foreground">emelbros</h1>
          <p className="text-muted-foreground text-sm">
            Sign in with your family Google account.
          </p>
        </div>

        <Button onClick={onSignIn} disabled={isPending} className="w-full">
          {isPending ? "Redirecting…" : "Continue with Google"}
        </Button>

        <ErrorNote error={error} />
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* B — Pink front door. The whole viewport is the brand, one bright only. */
/*     Consistent with #67's icon: white `e` knocked out of a pink tile.  */
/* ------------------------------------------------------------------ */

export function VariantB({ onSignIn, isPending, error }: VariantProps) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 bg-c-pink p-6 text-center">
      <div className="space-y-6">
        <Glyph className="mx-auto h-28 w-28 text-white sm:h-36 sm:w-36" />
        <h1 className="font-brand text-4xl text-white sm:text-5xl">emelbros</h1>
      </div>

      <div className="w-full max-w-xs space-y-4">
        <button
          type="button"
          onClick={onSignIn}
          disabled={isPending}
          className="w-full rounded-lg bg-white px-4 py-3 font-medium text-c-pink shadow-sm transition hover:bg-white/90 disabled:opacity-70"
        >
          {isPending ? "Redirecting…" : "Continue with Google"}
        </button>
        {error ? (
          <p className="text-sm text-white/90">{error}</p>
        ) : (
          <p className="text-sm text-white/80">Family only.</p>
        )}
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* C — Hero artwork. The two-line rainbow lockup at the one size where it   */
/*     has room to work: no 32px favicon floor, no 28px header ceiling.     */
/* ------------------------------------------------------------------ */

export function VariantC({ onSignIn, isPending, error }: VariantProps) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 p-6 text-center">
      <Image
        src="/brand/wordmark.svg"
        alt="Emelbros"
        width={425}
        height={220}
        priority
        className="w-64 max-w-[70vw] sm:w-80"
      />

      <div className="w-full max-w-xs space-y-4">
        <Button
          onClick={onSignIn}
          disabled={isPending}
          size="lg"
          className="w-full"
        >
          {isPending ? "Redirecting…" : "Continue with Google"}
        </Button>
        <ErrorNote error={error} />
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* D — Split doorway. Asymmetric, not centred. Warmth carried by copy      */
/*     rather than by scale, and the header's own lockup (#68) reused.     */
/* ------------------------------------------------------------------ */

export function VariantD({ onSignIn, isPending, error }: VariantProps) {
  return (
    <main className="flex flex-1 flex-col md:flex-row">
      <section className="flex flex-col justify-end gap-3 bg-secondary p-8 md:flex-1 md:justify-center md:p-12">
        <LiveWordmark className="text-4xl sm:text-5xl" />
        <p className="max-w-xs text-lg text-foreground/80">
          The family&apos;s own corner of the internet — darts, lists, habits,
          and whatever comes next.
        </p>
      </section>

      <section className="flex flex-col justify-start gap-6 p-8 md:flex-1 md:justify-center md:p-12">
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold text-foreground">
            Welcome back
          </h1>
          <p className="text-muted-foreground text-sm">
            Sign in with the Google account you use at home.
          </p>
        </div>

        <div className="max-w-sm space-y-3">
          <Button onClick={onSignIn} disabled={isPending} className="w-full">
            {isPending ? "Redirecting…" : "Continue with Google"}
          </Button>
          <ErrorNote error={error} />
        </div>
      </section>
    </main>
  );
}

export const PROTOTYPE_VARIANTS = [
  { key: "A", name: "Quiet crest" },
  { key: "B", name: "Pink front door" },
  { key: "C", name: "Hero artwork" },
  { key: "D", name: "Split doorway" },
];
