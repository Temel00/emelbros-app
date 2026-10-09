import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import { ToolGallery } from "@/modules/dev-tools/components/tool-gallery";
import { WorkshopSign } from "@/modules/dev-tools/components/workshop-sign";
import { tools } from "@/modules/dev-tools/tools/registry";

export default async function DevToolsPage() {
  const member = await getCurrentMember();
  // The proxy (ADR-0011) redirects signed-out requests before this runs.
  if (!member) return null;

  const supabase = await createClient();

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 pb-24 sm:p-6">
        <WorkshopSign />
        <ToolGallery tools={tools.map((t) => t.manifest)} />
      </main>
    </>
  );
}
