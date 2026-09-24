"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #187 resolves.
 *
 * Part of the `dense` flair prototype (#187). The dense tinted-produce field
 * (with page-specific accents woven in) is the LOCKED background. The manila
 * folder is the owner's favourite content container. The owner likes the `tab`
 * treatment's SIZING (a larger tab, sizable title text) and likes how the
 * earlier nav-into-folder idea folds the section nav into the tabs. This round
 * merges those two likes and drops the treatments no longer in play (`smooth`
 * and the flat equal-size `nav-tabs`). Three variants on `?card=`:
 *
 * - `tab`        — the classic single outlined manila folder tab carrying the
 *                  title. The owner's sizing benchmark; kept as-is.
 * - `nav-scaled` — the nutrition nav folded INTO the folder tabs, in natural
 *                  order, with the ACTIVE tab scaled up (larger, bolder, the
 *                  same size as the `tab` title) so it reads as the title while
 *                  the rest stay compact section tabs.
 * - `carousel`   — same scaled-up active tab, but the row is rotated so the
 *                  active tab is always LEFT-MOST; the remaining tabs keep their
 *                  order and wrap around to the end, like a carousel spun to
 *                  bring the current section to the front.
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

type CardVariant = "tab" | "nav-scaled" | "carousel";

const DEFAULT_VARIANT: CardVariant = "tab";

// The shared opaque surface: manila in light, a lighter blue in dark.
const SURFACE =
  "border-[#e2d4ad] bg-[#f4ead0] dark:border-[#33495c] dark:bg-[#21323f]";
// A recessed tab (inactive nav tab): slightly deeper than the surface.
const TAB_INACTIVE =
  "border-[#e2d4ad] bg-[#e9dcb6] text-muted-foreground hover:text-foreground dark:border-[#33495c] dark:bg-[#1a2833]";

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

// The scaled-up active tab (doubles as the title) — same size/weight as the
// `tab` variant's folder tab so the sizing the owner likes carries over.
function ActiveTab({ label }: { label: string }) {
  return (
    <span
      aria-current="page"
      className={`relative -mb-px rounded-t-2xl border border-b-0 ${SURFACE} px-5 pb-1.5 pt-2 text-base font-semibold text-foreground shadow-sm`}
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

// Rotate the nav so the active item is first (left-most); the rest keep their
// order and wrap around to the end. Returns the list unchanged if active is
// already first or not found.
function rotateToActive(active?: NutritionNavKey) {
  const idx = NUTRITION_NAV_ITEMS.findIndex((i) => i.key === active);
  if (idx <= 0) return NUTRITION_NAV_ITEMS;
  return [
    ...NUTRITION_NAV_ITEMS.slice(idx),
    ...NUTRITION_NAV_ITEMS.slice(0, idx),
  ];
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

  if (variant === "nav-scaled" || variant === "carousel") {
    const items =
      variant === "carousel" ? rotateToActive(active) : NUTRITION_NAV_ITEMS;
    return (
      <section className="mx-auto w-full max-w-3xl">
        {/* The nutrition nav AS folder tabs; the active tab is scaled up to
            serve as the title. `carousel` rotates the active tab to the front. */}
        <div className="flex flex-wrap items-end gap-1 pl-3">
          {items.map((item) =>
            item.key === active ? (
              <ActiveTab key={item.key} label={item.label} />
            ) : (
              <InactiveTab key={item.key} label={item.label} href={item.href} />
            ),
          )}
        </div>
        <Body rounded="rounded-2xl rounded-tl-none">
          {desc}
          {children}
        </Body>
      </section>
    );
  }

  // tab (default): the classic outlined manila folder tab — the owner's sizing
  // benchmark. Rounder tab corners and a rounded card top-left corner.
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
    param === "nav-scaled" || param === "carousel" ? param : DEFAULT_VARIANT;
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
