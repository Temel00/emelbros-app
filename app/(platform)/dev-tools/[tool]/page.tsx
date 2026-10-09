import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import { ToolShell } from "@/modules/dev-tools/components/tool-shell";
import { getTool, tools } from "@/modules/dev-tools/tools/registry";

// Built once at module scope so each Tool's component identity is stable
// across renders (react-hooks/static-components).
const toolComponents = Object.fromEntries(
  tools.map(({ manifest, load }) => [manifest.slug, dynamic(load)]),
);

export function generateStaticParams() {
  return tools.map(({ manifest }) => ({ tool: manifest.slug }));
}

/**
 * The only place a Tool's component is mounted (ADR-0019): resolve the slug
 * via the registry, 404 otherwise, and load the Tool as its own chunk.
 */
export default async function ToolPage({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool: slug } = await params;
  const entry = getTool(slug);
  if (!entry) notFound();

  const member = await getCurrentMember();
  // The proxy (ADR-0011) redirects signed-out requests before this runs.
  if (!member) return null;

  const supabase = await createClient();
  const Tool = toolComponents[slug];

  return (
    <ToolShell tool={entry.manifest} memberId={member.id} supabase={supabase}>
      <Tool />
    </ToolShell>
  );
}
