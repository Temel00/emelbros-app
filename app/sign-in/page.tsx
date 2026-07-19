"use client";

/**
 * PROTOTYPE WIRING — wayfinder #70. The real sign-in flow below is unchanged;
 * only the rendering swaps on `?variant=`. Fold the winner in and delete
 * `prototype-variants.tsx`, `prototype-positions.tsx` and the switcher when
 * the ticket resolves.
 *
 * Round one keys (A–D) still resolve by URL. The switcher cycles round two:
 * the D positioning options, D0–D4.
 *
 * `?frames=1` renders the current variant in 320/390/430/768 iframes — the
 * question this round is about small screens, and resizing a browser by hand
 * to check four of them is a bad way to spend an evening.
 */

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import { createClient } from "@/platform/supabase/client";
import { PrototypeSwitcher } from "@/components/prototype-switcher";

import {
  VariantA,
  VariantB,
  VariantC,
  VariantD,
  type VariantProps,
} from "./prototype-variants";
import {
  POSITION_VARIANTS,
  PositionD0,
  PositionD1,
  PositionD2,
  PositionD3,
  PositionD4,
} from "./prototype-positions";

const RENDERERS: Record<string, (props: VariantProps) => React.ReactNode> = {
  A: VariantA,
  B: VariantB,
  C: VariantC,
  D: VariantD,
  D0: PositionD0,
  D1: PositionD1,
  D2: PositionD2,
  D3: PositionD3,
  D4: PositionD4,
};

const FRAME_WIDTHS = [320, 390, 430, 768];

function SignInVariants() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const variant = searchParams.get("variant") ?? "D1";
  const showFrames = searchParams.get("frames") === "1";
  // `frames=0` marks the document as being *inside* one of the iframes, so it
  // renders the bare variant without a switcher bar in every frame.
  const embedded = searchParams.get("frames") === "0";

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

  const Render = RENDERERS[variant] ?? PositionD1;
  const props: VariantProps = { onSignIn: handleSignIn, isPending, error };

  if (showFrames) {
    return (
      <>
        <div className="flex flex-1 flex-wrap items-start justify-center gap-6 overflow-x-auto p-6 pb-24">
          {FRAME_WIDTHS.map((width) => (
            <figure key={width} className="shrink-0 space-y-2">
              <figcaption className="text-center font-mono text-xs text-muted-foreground">
                {width}px
              </figcaption>
              <iframe
                title={`${variant} at ${width}px`}
                src={`/sign-in?variant=${variant}&frames=0`}
                width={width}
                height={720}
                className="rounded-lg border border-border bg-background shadow-sm"
              />
            </figure>
          ))}
        </div>
        <PrototypeSwitcher variants={POSITION_VARIANTS} current={variant} />
      </>
    );
  }

  if (embedded) return <Render {...props} />;

  return (
    <>
      <Render {...props} />
      <PrototypeSwitcher variants={POSITION_VARIANTS} current={variant} />
    </>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInVariants />
    </Suspense>
  );
}
