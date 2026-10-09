import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import { WorkbenchIllustration } from "@/modules/dev-tools/components/workbench-illustration";

/** Themed 404 for an unknown Tool (ADR-0020). Dev Tools only. */
export default async function DevToolsNotFound() {
  const member = await getCurrentMember();
  const supabase = member ? await createClient() : null;

  return (
    <>
      {member && supabase && (
        <AppHeader memberId={member.id} supabase={supabase} />
      )}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <WorkbenchIllustration />
        <h1 className="text-xl font-semibold">Tool not found</h1>
        <p className="max-w-sm bg-background text-sm text-muted-foreground">
          There&apos;s no tool by that name on the workbench.
        </p>
        <Link
          href="/dev-tools"
          className="text-sm text-foreground underline underline-offset-4"
        >
          Back to Dev Tools
        </Link>
      </main>
    </>
  );
}
