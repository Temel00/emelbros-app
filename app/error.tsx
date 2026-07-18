"use client";

import { useEffect } from "react";

import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Route-segment error boundary for the whole app. Next renders this in place
 * of a crashed page instead of surfacing a bare "Script error" to the
 * browser. The common cause is a stale session (a valid JWT whose member row
 * was wiped by a `supabase db reset`) — `AppHeader` already redirects that
 * case to sign-in, so this is the catch-all for anything else that throws
 * during render.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="text-muted-foreground text-sm">
          This page hit an unexpected error. Try again, or sign in again if the
          problem continues.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2">
        <Button onClick={reset} className="w-full">
          Try again
        </Button>
        <a
          href="/sign-in"
          className={buttonVariants({
            variant: "outline",
            className: "w-full",
          })}
        >
          Sign in again
        </a>
      </div>
    </main>
  );
}
