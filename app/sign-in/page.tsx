"use client";

import { useState } from "react";

import { createClient } from "@/platform/supabase/client";
import { Button } from "@/components/ui/button";

/**
 * The four brights cycling across the live-text wordmark — the same lockup the
 * header uses (#68), so the front door and the signed-in shell agree.
 *
 * These are the *fill* tokens. #69 ruled the brights are fills only and a
 * parallel ink tier carries text, but the ink tokens do not exist yet (#73), so
 * this cycles fills in the meantime and inherits the header's known defect:
 * yellow is 1.33:1 on the light ground, landing on the `m` and `r`. Move this
 * to the ink tier when #73 lands — the same edge #68 records for the header.
 */
const WORDMARK_CYCLE = [
  "text-c-pink",
  "text-c-yellow",
  "text-c-green",
  "text-c-blue",
] as const;

function Wordmark() {
  return (
    <span
      role="img"
      aria-label="Emelbros"
      className="font-brand block text-4xl sm:text-5xl"
    >
      {"emelbros".split("").map((letter, i) => (
        <span key={i} aria-hidden className={WORDMARK_CYCLE[i % 4]}>
          {letter}
        </span>
      ))}
    </span>
  );
}

/**
 * Two panels meeting at a colour line. The flex direction flips at `md`, which
 * flips what the alignment utilities mean — `items-center` centres horizontally
 * when stacked and vertically when side by side, and `justify-end`/`justify-start`
 * pulls each block toward the seam either way. So the layout rule is written
 * once and reads correctly at both sizes; only the padding names a breakpoint.
 *
 * No AppHeader here: it renders a sign-out button and a member accent dot, and
 * its `getProfile` guard redirects to this page — rendering it would loop.
 */
export default function SignInPage() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setIsPending(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (signInError) {
      setError(signInError.message);
      setIsPending(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col md:flex-row">
      <section className="flex flex-1 flex-col items-center justify-end bg-secondary px-8 pt-12 pb-8 md:flex-row md:py-12 md:pr-8 md:pl-12">
        <div className="w-full max-w-xs space-y-3">
          <Wordmark />
          <p className="text-lg text-foreground/80">
            The family&apos;s own corner of the internet — darts, lists, habits,
            and whatever comes next.
          </p>
        </div>
      </section>

      <section className="flex flex-1 flex-col items-center justify-start px-8 pt-8 pb-12 md:flex-row md:py-12 md:pr-12 md:pl-8">
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
            <Button
              onClick={handleSignIn}
              disabled={isPending}
              className="w-full"
            >
              {isPending ? "Redirecting…" : "Continue with Google"}
            </Button>
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
