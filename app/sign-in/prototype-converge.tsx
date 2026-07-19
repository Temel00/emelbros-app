"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #70 resolves.
 *
 * Round three. D2 ("centred block, ragged text") won round two. The brief:
 * both blocks should **converge on the colour line**.
 *
 *   stacked   → centred horizontally, hugging the seam vertically
 *               (brand bottom-aligned, sign-in top-aligned)
 *   side by side → centred vertically, hugging the seam horizontally
 *               (brand pushed right, sign-in pushed left)
 *
 * The nice part: because the flex direction flips at `md`, the *same* two
 * utilities express both halves of that brief. `items-center` is horizontal
 * centring when stacked and vertical centring when side by side;
 * `justify-end` / `justify-start` is seam-hugging in both.
 *
 *   brand    flex-col items-center justify-end   md:flex-row
 *   sign-in  flex-col items-center justify-start md:flex-row
 *
 * So no variant below duplicates layout logic per breakpoint — what varies is
 * the three things the brief left open: how much air sits at the seam, whether
 * the type mirrors toward it, and what "centred horizontally" means for the
 * text itself when stacked.
 *
 * Colours still provisional pending #69; yellow is still 1.33:1 on light.
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

/**
 * The converge layout itself. Every variant below is this shell with
 * different seam padding and type alignment — the positioning rule is shared
 * so the options can't drift apart on anything except what's being compared.
 */
function Converge({
  props,
  brandClass,
  signInClass,
  brandType = "",
  signInType = "",
}: {
  props: VariantProps;
  /** padding that sets the gap between the brand block and the seam */
  brandClass: string;
  signInClass: string;
  /** text alignment inside each block */
  brandType?: string;
  signInType?: string;
}) {
  return (
    <main className="flex flex-1 flex-col md:flex-row">
      <section
        className={`flex flex-1 flex-col items-center justify-end bg-secondary md:flex-row ${brandClass}`}
      >
        <div className={`w-full max-w-xs space-y-3 ${brandType}`}>
          <LiveWordmark className="block text-4xl sm:text-5xl" />
          <p className="text-lg text-foreground/80">{BLURB}</p>
        </div>
      </section>

      <section
        className={`flex flex-1 flex-col items-center justify-start md:flex-row ${signInClass}`}
      >
        <div className={`w-full max-w-xs space-y-6 ${signInType}`}>
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

/* E0 — D2, for reference: everything centred, nothing hugging the seam. */
export function ConvergeE0(props: VariantProps) {
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

/* E1 — The brief, comfortable air. ~2rem of breathing room at the seam. */
export function ConvergeE1(props: VariantProps) {
  return (
    <Converge
      props={props}
      brandClass="px-8 pt-12 pb-8 md:py-12 md:pr-8 md:pl-12"
      signInClass="px-8 pt-8 pb-12 md:py-12 md:pr-12 md:pl-8"
    />
  );
}

/* E2 — The brief, tight. The two blocks nearly touch, so the colour line
   reads as a spine holding them together rather than a divider. */
export function ConvergeE2(props: VariantProps) {
  return (
    <Converge
      props={props}
      brandClass="px-8 pt-12 pb-4 md:py-12 md:pr-4 md:pl-12"
      signInClass="px-8 pt-4 pb-12 md:py-12 md:pr-12 md:pl-4"
    />
  );
}

/* E3 — Mirrored type. Side by side, the brand's text right-aligns so both
   blocks read *toward* the seam. Stacked, it returns to left-ragged. */
export function ConvergeE3(props: VariantProps) {
  return (
    <Converge
      props={props}
      brandClass="px-8 pt-12 pb-8 md:py-12 md:pr-8 md:pl-12"
      signInClass="px-8 pt-8 pb-12 md:py-12 md:pr-12 md:pl-8"
      brandType="md:text-right"
    />
  );
}

/* E4 — Centred type when stacked. Reads "centred horizontally" as applying to
   the type as well as the block; returns to D2's ragged left side by side. */
export function ConvergeE4(props: VariantProps) {
  return (
    <Converge
      props={props}
      brandClass="px-8 pt-12 pb-8 md:py-12 md:pr-8 md:pl-12"
      signInClass="px-8 pt-8 pb-12 md:py-12 md:pr-12 md:pl-8"
      brandType="text-center md:text-left"
      signInType="text-center md:text-left"
    />
  );
}

export const CONVERGE_VARIANTS = [
  { key: "E0", name: "D2 (reference)" },
  { key: "E1", name: "Converge, comfortable" },
  { key: "E2", name: "Converge, tight" },
  { key: "E3", name: "Converge, mirrored type" },
  { key: "E4", name: "Converge, centred type" },
];
