import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { AppHeader } from "@/components/app-header";
import { resolveIcon } from "@/lib/icon";
import type { ToolManifest } from "@/modules/dev-tools/lib/tool-manifest";
import type { Database } from "@/types/database";

// A plain helper so `resolveIcon`'s dynamic lookup doesn't read as a
// component created during render (react-hooks/static-components).
function toolIcon(name: string) {
  const Icon = resolveIcon(name);
  return <Icon className="size-4" aria-hidden />;
}

/**
 * Chrome around a lazily loaded Tool (ADR-0019): app header, a bar with the
 * Tool's name/icon and a back-to-gallery link, then a full-bleed `<main>` the
 * Tool owns entirely. A component rather than a layout because the gallery
 * and Tools need different chrome.
 */
export function ToolShell({
  tool,
  memberId,
  supabase,
  children,
}: {
  tool: ToolManifest;
  memberId: string;
  supabase: SupabaseClient<Database>;
  children: ReactNode;
}) {
  return (
    <>
      <AppHeader memberId={memberId} supabase={supabase} />
      <div className="flex items-center gap-3 border-b border-border px-4 py-2 sm:px-6">
        <Link
          href="/dev-tools"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Dev Tools
        </Link>
        <h1 className="flex items-center gap-2 text-sm font-semibold">
          {toolIcon(tool.icon)}
          {tool.name}
        </h1>
      </div>
      <main className="flex w-full flex-1 flex-col">{children}</main>
    </>
  );
}
