import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseAnonKey, supabaseUrl } from "@/platform/supabase/env";

import type { Database } from "@/types/database";

// Routes reachable while signed out (ADR-0011): the sign-in page itself, the
// OAuth redirect target that establishes the session, and the PWA manifest
// (ADR-0015) — browsers probe it for installability from the sign-in page
// too, before any session cookie exists.
const PUBLIC_PATHS = ["/sign-in", "/auth/callback", "/manifest.webmanifest"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Refreshes the Supabase session cookie on every navigation and redirects
 * signed-out members to /sign-in (ADR-0011). Server Components can't write
 * cookies themselves, so this is the one place session refresh happens.
 * Next's "proxy" file convention — the renamed successor to middleware.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getClaims() cryptographically verifies the JWT — never getSession() for
  // authorization decisions in server code.
  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = !error && data !== null;

  if (!isAuthenticated && !isPublicPath(request.nextUrl.pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/sign-in";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
