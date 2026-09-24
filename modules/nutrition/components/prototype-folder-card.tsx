"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #187 resolves.
 *
 * Part of the `dense` flair prototype (#187). The dense tinted-produce field
 * (with page-specific accents woven in) is the LOCKED background. The manila
 * folder is the owner's favourite content container. The owner has converged
 * on the nav-into-folder idea: the nutrition nav folds INTO the folder tabs, in
 * natural order, and the ACTIVE tab is scaled up to serve as the title. This
 * round rounds the card's top-left corner (was squared for the nav variants)
 * and turns the `?card=` axis into a comparison of how MUCH to scale the
 * active/title tab:
 *
 * - `nav-sm` — active tab slightly larger than its neighbours (text-base).
 * - `nav-md` — active tab clearly the title (text-lg, more padding).
 * - `nav-lg` — active tab dominant (text-xl, generous padding).
 * - `tab`    — the original single folder tab, kept as the sizing benchmark
 *              the owner first liked. Standalone pill nav still shows here.
 *
 * Colours (owner's call): manila in light mode, a lighter BLUE in dark mode.
 * Prototype-local arbitrary values, not #18 tokens — a win here decides whether
 * they graduate into real tokens.
 *
 * Client + useSearchParams (wrapped in Suspense so content still SSRs in the
 * default treatment), otherwise hook-free, drops into the server pages.
 */

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import {
  NUTRITION_NAV_ITEMS,
  type NutritionNavKey,
} from "@/modules/nutrition/components/nutrition-nav";

type NavScale = "nav-sm" | "nav-md" | "nav-lg";
type CardVariant = NavScale | "tab";

const DEFAULT_VARIANT: CardVariant = "nav-sm";

// The shared opaque surface: manila in light, a lighter blue in dark.
const SURFACE =
  "border-[#e2d4ad] bg-[#f4ead0] dark:border-[#33495c] dark:bg-[#21323f]";
// A recessed tab (inactive nav tab): slightly deeper than the surface.
const TAB_INACTIVE =
  "border-[#e2d4ad] bg-[#e9dcb6] text-muted-foreground hover:text-foreground dark:border-[#33495c] dark:bg-[#1a2833]";

// How far the active/title tab is scaled above the compact inactive tabs.
// Literal class strings so Tailwind's static scan sees every value.
const ACTIVE_SCALE: Record<NavScale, string> = {
  "nav-sm": "px-5 pb-1.5 pt-2 text-base",
  "nav-md": "px-6 pb-2 pt-2.5 text-lg",
  "nav-lg": "px-7 pb-2.5 pt-3 text-xl",
};

function Body({
  rounded,
  children,
}: {
  rounded: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${SURFACE} border ${rounded} p-5 shadow-sm sm:p-7`}>
      {children}
    </div>
  );
}

// The scaled-up active tab (doubles as the title). `scale` sets how much larger
// it reads than its neighbours.
function ActiveTab({ label, scale }: { label: string; scale: string }) {
  return (
    <span
      aria-current="page"
      className={`relative -mb-px rounded-t-2xl border border-b-0 ${SURFACE} ${scale} font-semibold text-foreground shadow-sm`}
    >
      {label}
    </span>
  );
}

// A compact inactive section tab.
function InactiveTab({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className={`rounded-t-lg border border-b-0 ${TAB_INACTIVE} px-3.5 pb-2 pt-1.5 text-sm font-medium`}
    >
      {label}
    </Link>
  );
}

function FolderShell({
  variant,
  active,
  title,
  description,
  children,
}: {
  variant: CardVariant;
  active?: NutritionNavKey;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const desc = description ? (
    <p className="mb-5 max-w-prose text-sm text-muted-foreground">
      {description}
    </p>
  ) : null;

  if (variant !== "tab") {
    const scale = ACTIVE_SCALE[variant];
    return (
      <section className="mx-auto w-full max-w-3xl">
        {/* The nutrition nav AS folder tabs, in natural order; the active tab
            is scaled up to serve as the title. */}
        <div className="flex flex-wrap items-end gap-1 pl-3">
          {NUTRITION_NAV_ITEMS.map((item) =>
            item.key === active ? (
              <ActiveTab key={item.key} label={item.label} scale={scale} />
            ) : (
              <InactiveTab key={item.key} label={item.label} href={item.href} />
            ),
          )}
        </div>
        {/* Rounded top-left corner (owner's call this round). */}
        <Body rounded="rounded-2xl">
          {desc}
          {children}
        </Body>
      </section>
    );
  }

  // tab: the original single outlined manila folder tab — the sizing benchmark
  // the owner first liked. Rounder tab corners + rounded card top-left corner.
  return (
    <section className="mx-auto w-full max-w-3xl">
      <div
        className={`ml-4 inline-flex w-fit items-center rounded-t-2xl border border-b-0 ${SURFACE} px-5 pb-1.5 pt-2 shadow-sm`}
      >
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
      </div>
      <Body rounded="rounded-2xl">
        {desc}
        {children}
      </Body>
    </section>
  );
}

function FolderInner(props: {
  active?: NutritionNavKey;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const param = useSearchParams().get("card");
  const variant: CardVariant =
    param === "nav-sm" ||
    param === "nav-md" ||
    param === "nav-lg" ||
    param === "tab"
      ? param
      : DEFAULT_VARIANT;
  return <FolderShell variant={variant} {...props} />;
}

export function PrototypeFolderCard(props: {
  active?: NutritionNavKey;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<FolderShell variant={DEFAULT_VARIANT} {...props} />}>
      <FolderInner {...props} />
    </Suspense>
  );
}
