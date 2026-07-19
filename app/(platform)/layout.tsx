import { Suspense } from "react";

import { AppHeader } from "@/components/app-header";
import {
  NavPrototype,
  type NavModule,
} from "@/components/prototype/nav-prototype";
import { modules } from "@/modules";
import { getCurrentMember } from "@/platform/auth";
import { getPins } from "@/platform/queries";
import { createClient } from "@/platform/supabase/server";

/**
 * PROTOTYPE — THROWAWAY CODE. Do not ship. (wayfinder #71)
 *
 * The `(platform)` group had no layout: all seven pages hand-rolled
 * `<AppHeader>` + `<main>`. This layout takes the header over so nav can
 * render *between* the header and the page — which is the refactor the ticket
 * asks about, done for real so its cost is measured rather than guessed.
 *
 * Three costs this surfaced by doing it:
 *
 * 1. `AppHeader` is documented as taking `memberId` + `supabase` from its
 *    caller specifically to avoid paying twice for JWT verification. A layout
 *    can't inherit those, so it calls `getCurrentMember()` + `createClient()`
 *    itself — and every page still calls both for its own data. That's a
 *    second verification per request, i.e. hoisting the header reverses a
 *    documented decision. Real fix is `cache()`-wrapping the accessors, which
 *    belongs in the implementation ticket.
 * 2. `getPins` was a dashboard-only query. Any nav that reflects pinned
 *    modules (variant B) makes it a *every-route* query. Not free.
 * 3. This layout does NOT cover the dashboard — `app/page.tsx` sits outside
 *    the group. So "Home" is the one nav destination whose own shell is
 *    somewhere else.
 */
export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await getCurrentMember();
  // The proxy (ADR-0011) redirects signed-out requests before this runs.
  if (!member) return null;

  const supabase = await createClient();
  const pins = await getPins(supabase, member.id);
  const pinnedSlugs = pins
    .filter((pin) => pin.widget === null)
    .map((pin) => pin.module);

  // Manifests carry non-serializable `component` fields; strip to nav shape.
  const navModules: NavModule[] = modules.map(({ slug, name, icon }) => ({
    slug,
    name,
    icon,
  }));

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      {/* useSearchParams() needs a Suspense boundary. */}
      <Suspense fallback={null}>
        <NavPrototype modules={navModules} pinnedSlugs={pinnedSlugs} />
      </Suspense>
      {children}
    </>
  );
}
