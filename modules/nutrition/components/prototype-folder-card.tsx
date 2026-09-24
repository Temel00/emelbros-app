"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #187 resolves.
 *
 * Part of the `dense` flair prototype (#187). The dense tinted-produce field
 * (with page-specific accents woven in) is the LOCKED background. The manila
 * folder is the owner's favourite content container, but "not quite right"
 * yet. This round explores it on `?card=` (floating bar, second row):
 *
 * - `tab`      — the classic outlined manila folder tab carrying the title.
 *                The owner's current leader.
 * - `smooth`   — one continuous shape: a borderless, same-colour raised title
 *                nub instead of a distinct outlined tab. A subtler hint at a
 *                folder rather than a literal one.
 * - `nav-tabs` — the nutrition nav folded INTO the folder: the section tabs
 *                run across the top, and the active tab is the title. The
 *                standalone pill nav hides itself when this is active.
 *
 * Colours (owner's call this round): manila in light mode, a lighter BLUE in
 * dark mode instead of the old orange/brown. Prototype-local arbitrary values,
 * not #18 tokens — a win here decides whether they graduate into real tokens.
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

type CardVariant = "tab" | "smooth" | "nav-tabs";

const DEFAULT_VARIANT: CardVariant = "tab";

// The shared opaque surface: manila in light, a lighter blue in dark.
const SURFACE =
  "border-[#e2d4ad] bg-[#f4ead0] dark:border-[#33495c] dark:bg-[#21323f]";
// Same fill with no border, for the `smooth` nub that merges into the body.
const SURFACE_BG = "bg-[#f4ead0] dark:bg-[#21323f]";
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

  if (variant === "smooth") {
    return (
      <section className="mx-auto w-full max-w-3xl">
        {/* Borderless, same-colour nub — reads as one continuous shape, a
            subtle hint at a folder rather than a distinct outlined tab. */}
        <div
          className={`ml-5 inline-flex w-fit rounded-t-2xl ${SURFACE_BG} px-5 pb-1 pt-2`}
        >
          <h1 className="text-base font-semibold text-foreground">{title}</h1>
        </div>
        <Body rounded="rounded-2xl rounded-tl-none">
          {desc}
          {children}
        </Body>
      </section>
    );
  }

  if (variant === "nav-tabs") {
    return (
      <section className="mx-auto w-full max-w-3xl">
        {/* The nutrition nav AS folder tabs; the active tab is the title. */}
        <div className="flex flex-wrap items-end gap-1 pl-3">
          {NUTRITION_NAV_ITEMS.map((item) =>
            item.key === active ? (
              <span
                key={item.key}
                aria-current="page"
                className={`relative -mb-px rounded-t-xl border border-b-0 ${SURFACE} px-4 pb-2 pt-2 text-sm font-semibold text-foreground shadow-sm`}
              >
                {item.label}
              </span>
            ) : (
              <Link
                key={item.key}
                href={item.href}
                className={`rounded-t-lg border border-b-0 ${TAB_INACTIVE} px-3.5 pb-2 pt-1.5 text-sm font-medium`}
              >
                {item.label}
              </Link>
            ),
          )}
        </div>
        <Body rounded="rounded-xl rounded-tl-none">
          {desc}
          {children}
        </Body>
      </section>
    );
  }

  // tab (default): the classic outlined manila folder tab, now with rounder
  // tab corners and a rounded top-left corner on the card body too.
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
    param === "smooth" || param === "nav-tabs" ? param : DEFAULT_VARIANT;
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
