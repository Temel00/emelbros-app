"use client";

/**
 * PROTOTYPE — THROWAWAY CODE. Do not ship. (wayfinder #71)
 *
 * "Four variants of cross-module navigation, switchable via `?variant=`,
 * mounted on the real (platform) routes."
 *
 * Variants:
 *   A — Breadcrumb trail          (the owner asked for these by name)
 *   B — Header module switcher    (a row of modules, not a menu — there are only 3)
 *   C — Bottom nav bar            (mobile-first PWA, thumb reach)
 *   D — Contextual back-link only (the minimal counter-proposal to A)
 *
 * No mutations, no persistence, no tests. Every variant is driven from the
 * module registry (`modules/index.ts`) — none of them hardcode a module list.
 */

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";

import { resolveIcon } from "@/lib/icon";
import { cn } from "@/lib/utils";

export type NavModule = { slug: string; name: string; icon: string };

// Manifest `icon` is a Lucide *name*; the platform already has a resolver
// (lib/icon.ts), so nav needs no icon list of its own and a new module
// appears in every variant with zero edits here.
const iconFor = resolveIcon;

export const VARIANTS = ["A", "B", "C", "D"] as const;
export type Variant = (typeof VARIANTS)[number];

const VARIANT_NAMES: Record<Variant, string> = {
  A: "Breadcrumb trail",
  B: "Header module switcher",
  C: "Bottom nav bar",
  D: "Contextual back-link",
};

/* ------------------------------------------------------------------ */
/* Route → label resolution                                            */
/* ------------------------------------------------------------------ */

/**
 * NOTE (a real finding, not a shortcut): the module manifest carries no route
 * metadata and no sub-routes, and nothing anywhere can supply a *title* for an
 * `[id]` segment. So a breadcrumb's leaf crumb can only ever say "Game" or
 * "List", never "Game vs Dad" or "Camping trip". Fixing that means either
 * threading a title down from each page or adding route metadata to the
 * manifest — cost that lands on variant A and D, and on nobody else.
 */
function segmentLabel(segment: string, modules: NavModule[]): string {
  const mod = modules.find((m) => m.slug === segment);
  if (mod) return mod.name;
  if (segment === "new") return "New";
  if (segment === "stats") return "Stats";
  // Anything else is an id.
  return "Detail";
}

type Crumb = { href: string; label: string };

function crumbsFor(pathname: string, modules: NavModule[]): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [{ href: "/", label: "Home" }];
  let acc = "";
  for (const segment of segments) {
    acc += `/${segment}`;
    crumbs.push({ href: acc, label: segmentLabel(segment, modules) });
  }
  return crumbs;
}

/* ------------------------------------------------------------------ */
/* Variant-preserving links                                            */
/* ------------------------------------------------------------------ */

function useWithVariant() {
  const searchParams = useSearchParams();
  const variant = searchParams.get("variant") ?? "A";
  return (href: string) => `${href}?variant=${variant}`;
}

/* ------------------------------------------------------------------ */
/* A — Breadcrumb trail                                                */
/* ------------------------------------------------------------------ */

function VariantA({ modules }: { modules: NavModule[] }) {
  const pathname = usePathname();
  const withVariant = useWithVariant();
  const crumbs = crumbsFor(pathname, modules);

  return (
    <div className="sticky top-[57px] z-9 border-b border-border bg-background/95 backdrop-blur">
      <nav
        aria-label="Breadcrumb"
        className="mx-auto w-full max-w-3xl px-4 py-2 sm:px-6"
      >
        <ol className="flex items-center gap-1 text-sm">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <li key={crumb.href} className="flex items-center gap-1">
                {i > 0 && (
                  <ChevronRight
                    aria-hidden
                    className="size-3.5 text-muted-foreground"
                  />
                )}
                {isLast ? (
                  <span aria-current="page" className="font-medium">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={withVariant(crumb.href)}
                    className="text-muted-foreground hover:text-primary hover:underline"
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* B — Header module switcher                                          */
/* ------------------------------------------------------------------ */

function VariantB({
  modules,
  pinnedSlugs,
}: {
  modules: NavModule[];
  pinnedSlugs: string[];
}) {
  const pathname = usePathname();
  const withVariant = useWithVariant();

  return (
    <div className="sticky top-[57px] z-9 border-b border-border bg-background/95 backdrop-blur">
      <nav
        aria-label="Modules"
        className="mx-auto w-full max-w-3xl px-4 py-2 sm:px-6"
      >
        <ul className="flex items-center gap-1 overflow-x-auto">
          <li>
            <Link
              href={withVariant("/")}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm whitespace-nowrap",
                pathname === "/"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Home aria-hidden className="size-4" />
              Home
            </Link>
          </li>
          {modules.map((mod) => {
            const Icon = iconFor(mod.icon);
            const active = pathname.startsWith(`/${mod.slug}`);
            const pinned = pinnedSlugs.includes(mod.slug);
            return (
              <li key={mod.slug}>
                <Link
                  href={withVariant(`/${mod.slug}`)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm whitespace-nowrap",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon aria-hidden className="size-4" />
                  {mod.name}
                  {/* ADR-0002 probe: unpinned modules stay reachable, but are
                      they visually demoted? Dot marks pinned-ness only. */}
                  {!pinned && !active && (
                    <span
                      aria-hidden
                      title="not pinned to your dashboard"
                      className="size-1.5 rounded-full bg-muted-foreground/40"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* C — Bottom nav bar                                                  */
/* ------------------------------------------------------------------ */

function VariantC({ modules }: { modules: NavModule[] }) {
  const pathname = usePathname();
  const withVariant = useWithVariant();

  const items = [
    { href: "/", label: "Home", icon: Home, active: pathname === "/" },
    ...modules.map((mod) => ({
      href: `/${mod.slug}`,
      label: mod.name,
      icon: iconFor(mod.icon),
      active: pathname.startsWith(`/${mod.slug}`),
    })),
  ];

  return (
    <nav
      aria-label="Modules"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex w-full max-w-3xl items-stretch justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={withVariant(item.href)}
                aria-current={item.active ? "page" : undefined}
                className={cn(
                  // 56px min target — thumb reach is the whole point here.
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 px-2 py-2 text-xs",
                  item.active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon aria-hidden className="size-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* D — Contextual back-link only                                       */
/* ------------------------------------------------------------------ */

function VariantD({ modules }: { modules: NavModule[] }) {
  const pathname = usePathname();
  const withVariant = useWithVariant();
  const crumbs = crumbsFor(pathname, modules);

  // The whole variant: one link to the parent. Nothing on the dashboard.
  if (crumbs.length < 2) return null;
  const parent = crumbs[crumbs.length - 2];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-3 sm:px-6">
      <Link
        href={withVariant(parent.href)}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {parent.label}
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Switcher                                                            */
/* ------------------------------------------------------------------ */

function PrototypeSwitcher({ current }: { current: Variant }) {
  const router = useRouter();
  const pathname = usePathname();

  const go = (delta: number) => {
    const i = VARIANTS.indexOf(current);
    const next = VARIANTS[(i + delta + VARIANTS.length) % VARIANTS.length];
    router.replace(`${pathname}?variant=${next}`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed right-4 bottom-20 z-50 flex items-center gap-2 rounded-full border-2 border-black bg-yellow-300 px-2 py-1 text-black shadow-lg sm:bottom-4">
      <button
        onClick={() => go(-1)}
        aria-label="Previous variant"
        className="rounded-full px-2 py-1 hover:bg-black/10"
      >
        ←
      </button>
      <span className="text-xs font-semibold whitespace-nowrap">
        {current} — {VARIANT_NAMES[current]}
      </span>
      <button
        onClick={() => go(1)}
        aria-label="Next variant"
        className="rounded-full px-2 py-1 hover:bg-black/10"
      >
        →
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

export function NavPrototype({
  modules,
  pinnedSlugs,
}: {
  modules: NavModule[];
  pinnedSlugs: string[];
}) {
  const searchParams = useSearchParams();
  const raw = searchParams.get("variant") ?? "A";
  const variant = (VARIANTS as readonly string[]).includes(raw)
    ? (raw as Variant)
    : "A";

  return (
    <>
      {variant === "A" && <VariantA modules={modules} />}
      {variant === "B" && (
        <VariantB modules={modules} pinnedSlugs={pinnedSlugs} />
      )}
      {variant === "C" && <VariantC modules={modules} />}
      {variant === "D" && <VariantD modules={modules} />}
      <PrototypeSwitcher current={variant} />
      {/* Bottom nav is fixed; keep the last of the page clear of it. */}
      {variant === "C" && <div aria-hidden className="h-16" />}
    </>
  );
}
