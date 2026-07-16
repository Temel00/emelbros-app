"use client";

import { useState } from "react";

import { createClient } from "@/platform/supabase/client";
import { Button } from "@/components/ui/button";

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
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Emelbros</h1>
        <p className="text-muted-foreground">
          Sign in with your family Google account.
        </p>
      </div>

      <Button onClick={handleSignIn} disabled={isPending} className="w-full">
        {isPending ? "Redirecting…" : "Sign in with Google"}
      </Button>

      {error && <p className="text-destructive text-sm">{error}</p>}
    </main>
  );
}
