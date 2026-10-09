import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import { tools } from "@/modules/dev-tools/tools/registry";

/** Bare placeholder gallery; replaced by the real gallery (T2). */
export default async function DevToolsPage() {
  const member = await getCurrentMember();
  // The proxy (ADR-0011) redirects signed-out requests before this runs.
  if (!member) return null;

  const supabase = await createClient();

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 sm:p-6">
        <h1 className="text-xl font-semibold">Dev Tools</h1>
        <ul className="flex flex-col gap-2">
          {tools.map(({ manifest }) => (
            <li key={manifest.slug}>
              <Link
                href={`/dev-tools/${manifest.slug}`}
                className="underline-offset-4 hover:underline"
              >
                {manifest.name}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
