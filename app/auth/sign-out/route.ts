import { NextResponse } from "next/server";

import { createClient } from "@/platform/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // 303, not NextResponse.redirect's default 307: a 307 replays the form's
  // POST against /sign-in, which Next treats as a Server Action submission and
  // errors on. 303 tells the browser to follow up with a plain GET.
  return NextResponse.redirect(new URL("/sign-in", request.url), 303);
}
