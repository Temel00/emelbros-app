// PROTOTYPE (#201): SVG Sandbox layout + hot-reload feel, ?variant=A|B|C. Throwaway.
import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";

import { Sandbox } from "./sandbox";

export default async function SvgSandboxPrototypePage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>;
}) {
  const member = await getCurrentMember();
  if (!member) return null;
  const supabase = await createClient();
  const { variant = "A" } = await searchParams;
  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <Sandbox variant={variant} />
    </>
  );
}
