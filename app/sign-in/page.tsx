"use client";

/**
 * PROTOTYPE WIRING — wayfinder #70. The real sign-in flow below is unchanged;
 * only the rendering swaps on `?variant=`. Fold the winner in and delete
 * `prototype-variants.tsx` + the switcher when the ticket resolves.
 */

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import { createClient } from "@/platform/supabase/client";
import { PrototypeSwitcher } from "@/components/prototype-switcher";

import {
  PROTOTYPE_VARIANTS,
  VariantA,
  VariantB,
  VariantC,
  VariantD,
  type VariantProps,
} from "./prototype-variants";

function SignInVariants() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const variant = searchParams.get("variant") ?? "A";

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

  const props: VariantProps = { onSignIn: handleSignIn, isPending, error };

  return (
    <>
      {variant === "A" && <VariantA {...props} />}
      {variant === "B" && <VariantB {...props} />}
      {variant === "C" && <VariantC {...props} />}
      {variant === "D" && <VariantD {...props} />}
      <PrototypeSwitcher variants={PROTOTYPE_VARIANTS} current={variant} />
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
