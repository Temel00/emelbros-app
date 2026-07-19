"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #70 resolves.
 *
 * Round two. Direction D ("Split doorway") won round one; its *structure* is
 * now held fixed — cycling live-text wordmark, warm line, sign-in panel — and
 * only the **positioning** varies. The brief: it should read as centred at
 * every width, especially once it stacks.
 *
 * Two concrete faults in D-as-built that these are answering:
 *   1. `justify-end` / `justify-start` pin each panel's content to the seam,
 *      so stacked it clumps in the middle of the screen rather than sitting
 *      centred within its own half.
 *   2. Nothing is horizontally centred or `mx-auto`'d, so on a wide phone the
 *      text hugs the left edge.
 *
 * Colours remain provisional pending #69; the yellow letter is still 1.33:1
 * on the light ground.
 */

import { Button } from "@/components/ui/button";

import type { VariantProps } from "./prototype-variants";

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

const BLURB =
  "The family's own corner of the internet — darts, lists, habits, and whatever comes next.";

function SignInAction({ onSignIn, isPending, error }: VariantProps) {
  return (
    <>
      <Button onClick={onSignIn} disabled={isPending} className="w-full">
        {isPending ? "Redirecting…" : "Continue with Google"}
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* D0 — As built. Reference only, so the fix is visible as a diff.     */
/* ------------------------------------------------------------------ */

export function PositionD0(props: VariantProps) {
  return (
    <main className="flex flex-1 flex-col md:flex-row">
      <section className="flex flex-col justify-end gap-3 bg-secondary p-8 md:flex-1 md:justify-center md:p-12">
        <LiveWordmark className="text-4xl sm:text-5xl" />
        <p className="max-w-xs text-lg text-foreground/80">{BLURB}</p>
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
          <SignInAction {...props} />
        </div>
      </section>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* D1 — Mirrored centre. Both halves centre their own content, both     */
/*      axes, at every width. The split stays 50/50 when stacked.       */
/* ------------------------------------------------------------------ */

export function PositionD1(props: VariantProps) {
  return (
    <main className="flex flex-1 flex-col md:flex-row">
      <section className="flex flex-1 flex-col items-center justify-center gap-3 bg-secondary p-8 text-center md:p-12">
        <LiveWordmark className="text-4xl sm:text-5xl" />
        <p className="max-w-xs text-lg text-foreground/80">{BLURB}</p>
      </section>
      <section className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center md:p-12">
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold text-foreground">
            Welcome back
          </h1>
          <p className="text-muted-foreground text-sm">
            Sign in with the Google account you use at home.
          </p>
        </div>
        <div className="w-full max-w-sm space-y-3">
          <SignInAction {...props} />
        </div>
      </section>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* D2 — Centred block, ragged text. The content *block* is centred but  */
/*      the type stays left-aligned — keeps D's editorial voice.        */
/* ------------------------------------------------------------------ */

export function PositionD2(props: VariantProps) {
  return (
    <main className="flex flex-1 flex-col md:flex-row">
      <section className="flex flex-1 items-center justify-center bg-secondary p-8 md:p-12">
        <div className="w-full max-w-xs space-y-3">
          <LiveWordmark className="block text-4xl sm:text-5xl" />
          <p className="text-lg text-foreground/80">{BLURB}</p>
        </div>
      </section>
      <section className="flex flex-1 items-center justify-center p-8 md:p-12">
        <div className="w-full max-w-xs space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold text-foreground">
              Welcome back
            </h1>
            <p className="text-muted-foreground text-sm">
              Sign in with the Google account you use at home.
            </p>
          </div>
          <div className="space-y-3">
            <SignInAction {...props} />
          </div>
        </div>
      </section>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* D3 — Collapse to one column. Below md there is no split at all: one  */
/*      ground, one centred column. The 50/50 band only exists on wide. */
/* ------------------------------------------------------------------ */

export function PositionD3(props: VariantProps) {
  return (
    <main className="flex flex-1 flex-col md:flex-row">
      <section className="flex flex-col items-center justify-center gap-3 p-8 text-center md:flex-1 md:bg-secondary md:p-12">
        <LiveWordmark className="text-4xl sm:text-5xl" />
        <p className="max-w-xs text-lg text-foreground/80">{BLURB}</p>
      </section>
      <section className="flex flex-col items-center justify-center gap-6 px-8 pb-8 text-center md:flex-1 md:p-12">
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold text-foreground">
            Welcome back
          </h1>
          <p className="text-muted-foreground text-sm">
            Sign in with the Google account you use at home.
          </p>
        </div>
        <div className="w-full max-w-sm space-y-3">
          <SignInAction {...props} />
        </div>
      </section>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* D4 — Brand band + centred card. The brand sizes to its content       */
/*      instead of claiming half the screen; the card centres in the    */
/*      remainder. Nothing is ever pinned to a seam.                    */
/* ------------------------------------------------------------------ */

export function PositionD4(props: VariantProps) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-secondary p-6">
      <section className="flex flex-col items-center gap-3 text-center">
        <LiveWordmark className="text-4xl sm:text-5xl" />
        <p className="max-w-xs text-lg text-foreground/80">{BLURB}</p>
      </section>

      <section className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold text-foreground">
            Welcome back
          </h1>
          <p className="text-muted-foreground text-sm">
            Sign in with the Google account you use at home.
          </p>
        </div>
        <div className="space-y-3">
          <SignInAction {...props} />
        </div>
      </section>
    </main>
  );
}

export const POSITION_VARIANTS = [
  { key: "D0", name: "As built (reference)" },
  { key: "D1", name: "Mirrored centre" },
  { key: "D2", name: "Centred block, ragged text" },
  { key: "D3", name: "Collapse to one column" },
  { key: "D4", name: "Brand band + centred card" },
];
