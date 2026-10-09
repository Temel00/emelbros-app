import Link from "next/link";

import { resolveIcon } from "@/lib/icon";
import { cn } from "@/lib/utils";
import { brightForSlug } from "@/modules/dev-tools/lib/bright";
import type { ToolManifest } from "@/modules/dev-tools/lib/tool-manifest";

// Plain helper so `resolveIcon`'s dynamic lookup doesn't read as a component
// created during render (react-hooks/static-components).
function toolIcon(name: string, className: string) {
  const Icon = resolveIcon(name);
  return <Icon className={className} aria-hidden />;
}

/**
 * The gallery's pegboard (ADR-0020): a dotted board of manila tool tags.
 * Brights tint only the icon and handle stripe; name and description sit on
 * the opaque folder surface in foreground colours. Tilt is static; the hover
 * lift is `motion-safe:` only.
 */
export function ToolGallery({ tools }: { tools: ToolManifest[] }) {
  return (
    <ul
      className="grid grid-cols-2 gap-x-3 gap-y-4 rounded-xl border-2 border-c-surface-folder-border bg-c-surface-tab-inactive p-4 sm:grid-cols-3 lg:grid-cols-4"
      style={{
        backgroundImage:
          "radial-gradient(circle, var(--c-surface-folder-border) 1.5px, transparent 1.5px)",
        backgroundSize: "22px 22px",
      }}
    >
      {tools.map((tool, i) => {
        const bright = brightForSlug(tool.slug);
        return (
          <li
            key={tool.slug}
            className={cn(
              "pt-3",
              i % 2 ? "rotate-[0.6deg]" : "-rotate-[0.6deg]",
            )}
          >
            <Link
              href={`/dev-tools/${tool.slug}`}
              className="relative flex h-full flex-col gap-2 rounded-md border-2 border-c-surface-folder-border bg-c-surface-folder p-4 pt-6 shadow-[3px_3px_0_0_var(--c-surface-folder-border)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-safe:transition-transform motion-safe:hover:-translate-y-0.5"
            >
              <span
                aria-hidden
                className="absolute top-2 left-1/2 size-2.5 -translate-x-1/2 rounded-full border-2 border-c-surface-folder-border bg-background"
              />
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-0 top-0 h-1.5 rounded-t-sm",
                  bright.stripe,
                )}
              />
              {toolIcon(tool.icon, cn("size-8", bright.icon))}
              <span className="font-mono text-sm font-bold tracking-wide text-foreground uppercase">
                {tool.name}
              </span>
              <span className="line-clamp-2 text-sm text-muted-foreground">
                {tool.description}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
