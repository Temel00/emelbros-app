import { NextResponse } from "next/server";

import { createClient } from "@/platform/supabase/server";

/**
 * OAuth redirect target (ADR-0011): exchanges the code Supabase's Google
 * provider hands back for a session, then sends the member into the app.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only same-origin paths: `${origin}${next}` with next = "@evil.com",
  // "//evil.com" or "/\evil.com" would otherwise send a freshly signed-in
  // member off-site.
  const requested = searchParams.get("next");
  const next = requested && /^\/(?![/\\])/.test(requested) ? requested : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in`);
}
