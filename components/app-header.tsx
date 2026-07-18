import Link from "next/link";
import { redirect } from "next/navigation";

import { ACCENT_BG } from "@/lib/accent";
import { cn } from "@/lib/utils";
import { getProfile } from "@/platform/queries";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * The app shell's header (#27, ADR-0014/0015): a nav landmark for the brand
 * (the one destination until modules register their own), theme toggle, the
 * member's accent as an identity dot, and sign out. Sticky so it stays
 * reachable while the dashboard content scrolls on small screens.
 *
 * Takes the member id and an already-verified Supabase client from the page
 * that renders it, rather than re-deriving both — the caller has already
 * paid for `getCurrentMember()`'s JWT verification.
 */
export async function AppHeader({
  memberId,
  supabase,
}: {
  memberId: string;
  supabase: SupabaseClient<Database>;
}) {
  const profile = await getProfile(supabase, memberId);

  // A cryptographically-valid JWT can outlive its member row — the DB was
  // reset (dev) or the account was deleted while a session was still open.
  // `getClaims()`/the proxy (ADR-0011) only verify the token, not that the
  // member still exists, so every platform page renders this header with a
  // ghost id. Without a profile there's no header to draw; bounce to sign-in
  // so a fresh Google sign-in re-provisions the member (handle_new_member)
  // instead of throwing an unhandled render error on every page.
  if (!profile) redirect("/sign-in");

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <nav aria-label="Primary">
          <Link href="/" className="font-brand text-xl text-primary">
            Emelbros
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <span
            aria-hidden
            title={`${profile.accent} accent`}
            className={cn("size-5 rounded-full", ACCENT_BG[profile.accent])}
          />
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
