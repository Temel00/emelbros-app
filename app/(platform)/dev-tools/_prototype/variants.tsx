// PROTOTYPE (#196): four gallery directions on one route. Throwaway.
//  A  platform tokens only, scrollable grid (icon + name + blurb)
//  B  platform tokens only, fixed 4×5 grid that fits the viewport (icon + name)
//  C  workshop/toolbench look (needs an ADR-0018-style exception), scrollable pegboard
//  D  workshop look, fixed 4×5 tool-cabinet drawers
import { createElement } from "react";
import Link from "next/link";
import { icons, LayoutGrid, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { DUMMY_TOOLS, type DummyTool } from "./tools";

function ToolIcon({ name, className }: { name: string; className?: string }) {
  return createElement(
    (icons as Record<string, LucideIcon>)[name] ?? LayoutGrid,
    { className, "aria-hidden": true },
  );
}

const BRIGHTS = ["text-c-pink", "text-c-yellow", "text-c-green", "text-c-blue"];
const BRIGHT_BG = ["bg-c-pink", "bg-c-yellow", "bg-c-green", "bg-c-blue"];

function Heading() {
  return <h1 className="text-2xl font-semibold tracking-tight">Dev Tools</h1>;
}

/* ---------- A: tokens, scroll ---------- */
export function VariantA() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 pb-24 sm:p-6">
      <Heading />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {DUMMY_TOOLS.map((t) => {
          return (
            <li key={t.slug}>
              <Link
                href="#"
                className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-secondary">
                  <ToolIcon name={t.icon} className="size-5" />
                </span>
                <span className="font-medium">{t.name}</span>
                <span className="text-sm text-muted-foreground">{t.blurb}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

/* ---------- B: tokens, fixed 4×5 ---------- */
export function VariantB() {
  return (
    <main className="mx-auto flex h-[calc(100dvh-3.75rem)] w-full max-w-5xl flex-col gap-3 p-3 pb-16 sm:p-6 sm:pb-20">
      <Heading />
      <ul className="grid min-h-0 flex-1 grid-cols-4 grid-rows-5 gap-2 sm:gap-3">
        {DUMMY_TOOLS.map((t) => {
          return (
            <li key={t.slug} className="min-h-0">
              <Link
                href="#"
                className="flex h-full flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card p-1.5 text-center transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:gap-2"
              >
                <ToolIcon name={t.icon} className="size-6 sm:size-7" />
                <span className="line-clamp-2 text-[11px] leading-tight font-medium sm:text-sm">
                  {t.name}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

/* ---------- C: workshop pegboard, scroll ---------- */
function PegTag({ t, i }: { t: DummyTool; i: number }) {
  return (
    <li className={cn("pt-3", i % 2 ? "rotate-[0.6deg]" : "-rotate-[0.6deg]")}>
      <Link
        href="#"
        className="relative flex h-full flex-col gap-2 rounded-md border-2 border-c-surface-folder-border bg-c-surface-folder p-4 pt-6 shadow-[3px_3px_0_0_var(--c-surface-folder-border)] transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {/* peg hole */}
        <span
          aria-hidden
          className="absolute top-2 left-1/2 size-2.5 -translate-x-1/2 rounded-full border-2 border-c-surface-folder-border bg-background"
        />
        {/* tool handle stripe */}
        <span
          aria-hidden
          className={cn(
            "absolute inset-x-0 top-0 h-1.5 rounded-t-sm",
            BRIGHT_BG[i % 4],
          )}
        />
        <ToolIcon name={t.icon} className={cn("size-8", BRIGHTS[i % 4])} />
        <span className="font-mono text-sm font-bold tracking-wide uppercase">
          {t.name}
        </span>
        <span className="text-sm text-muted-foreground">{t.blurb}</span>
      </Link>
    </li>
  );
}

export function VariantC() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 pb-24 sm:p-6">
      <Heading />
      <ul
        className="grid grid-cols-2 gap-x-3 gap-y-4 rounded-xl border-2 border-c-surface-folder-border bg-c-surface-tab-inactive p-4 sm:grid-cols-3 lg:grid-cols-4"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--c-surface-folder-border) 1.5px, transparent 1.5px)",
          backgroundSize: "22px 22px",
        }}
      >
        {DUMMY_TOOLS.map((t, i) => (
          <PegTag key={t.slug} t={t} i={i} />
        ))}
      </ul>
    </main>
  );
}

/* ---------- D: workshop cabinet, fixed 4×5 ---------- */
export function VariantD() {
  return (
    <main className="mx-auto flex h-[calc(100dvh-3.75rem)] w-full max-w-5xl flex-col gap-3 p-3 pb-16 sm:p-6 sm:pb-20">
      <Heading />
      <ul className="grid min-h-0 flex-1 grid-cols-4 grid-rows-5 gap-1.5 rounded-lg border-2 border-c-surface-folder-border bg-c-surface-folder-border p-1.5 sm:gap-2 sm:p-2">
        {DUMMY_TOOLS.map((t, i) => {
          return (
            <li key={t.slug} className="min-h-0">
              <Link
                href="#"
                className="relative flex h-full flex-col items-center justify-between gap-1 rounded-sm border border-c-surface-folder-border bg-c-surface-folder px-1 pt-2 pb-1 shadow-[inset_0_-3px_0_0_var(--c-surface-folder-border)] transition-colors hover:bg-c-surface-tab-inactive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-1 right-1 size-1.5 rounded-full",
                    BRIGHT_BG[i % 4],
                  )}
                />
                <ToolIcon
                  name={t.icon}
                  className={cn("size-6 sm:size-8", BRIGHTS[i % 4])}
                />
                {/* label-holder plate */}
                <span className="w-full truncate rounded-[3px] border border-c-surface-folder-border bg-background px-1 py-0.5 text-center font-mono text-[9px] font-bold tracking-wide uppercase sm:text-xs">
                  {t.name}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
