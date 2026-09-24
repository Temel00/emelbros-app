"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #187 resolves.
 *
 * Part of the `dense` flair prototype (#187). The dense tinted-produce field
 * (with page-specific accents woven in) is the LOCKED background. The open
 * composition question is how title + content stay legible and undistracted
 * over it. The first answer — a bold manila folder — read as "too bold"; the
 * owner asked for a subtler, lighter tone and a rounder, softer shape, and to
 * SEE a few title/tab treatments side by side to judge legibility + looks.
 *
 * So this card is now switchable on `?card=` (floating bar, second row):
 *
 * - `tab`   — soft rounded folder tab carrying the title (the folder idea,
 *             softened: lighter cream, fully rounded, gentle shadow).
 * - `chip`  — title in a rounded pill chip inset at the top of the card, no
 *             protruding tab. Reads as a label sitting inside the content.
 * - `plain` — title as a heading inside the card with a short tinted underline
 *             accent, no tab or chip. The quietest option.
 *
 * All three share ONE refined surface: a light, barely-warm opaque card with a
 * big soft radius, so the flair only shows in the gutter around it. Tones are
 * prototype-local arbitrary values (not #18 tokens); a win here decides whether
 * they graduate into real surface tokens.
 *
 * Client + useSearchParams (wrapped in Suspense so the content still SSRs in
 * the default treatment), hook-free otherwise, drops into the server pages.
 */

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

type CardVariant = "tab" | "chip" | "plain";

const DEFAULT_VARIANT: CardVariant = "tab";

// One refined, opaque surface shared by every treatment: light + barely warm,
// big soft radius, gentle shadow. Lighter and rounder than the first manila.
const SURFACE =
  "rounded-3xl border border-[#efe7d3] bg-[#faf6ec] shadow-sm dark:border-[#322e26] dark:bg-[#221f18]";

function FolderShell({
  variant,
  title,
  description,
  children,
}: {
  variant: CardVariant;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const desc = description ? (
    <p className="mb-5 max-w-prose text-sm text-muted-foreground">
      {description}
    </p>
  ) : null;

  if (variant === "tab") {
    return (
      <section className="mx-auto w-full max-w-3xl">
        {/* Soft rounded folder tab — same surface as the body, sits just above. */}
        <div className="ml-4 inline-flex w-fit items-center rounded-2xl rounded-b-none border border-b-0 border-[#efe7d3] bg-[#faf6ec] px-5 pb-2 pt-2 shadow-sm dark:border-[#322e26] dark:bg-[#221f18]">
          <h1 className="text-base font-semibold text-foreground">{title}</h1>
        </div>
        <div className={`${SURFACE} rounded-tl-xl p-5 sm:p-7`}>
          {desc}
          {children}
        </div>
      </section>
    );
  }

  if (variant === "chip") {
    return (
      <section className="mx-auto w-full max-w-3xl">
        <div className={`${SURFACE} p-5 sm:p-7`}>
          {/* Title as a soft pill chip sitting inside the top of the card. */}
          <span className="mb-4 inline-flex items-center rounded-full bg-[#f0e6cf] px-4 py-1 text-sm font-semibold text-foreground dark:bg-[#2d2920]">
            {title}
          </span>
          {desc}
          {children}
        </div>
      </section>
    );
  }

  // plain
  return (
    <section className="mx-auto w-full max-w-3xl">
      <div className={`${SURFACE} p-5 sm:p-7`}>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        {/* Short tinted underline — a quiet nod to the flair palette. */}
        <div className="mb-4 mt-1.5 h-1 w-10 rounded-full bg-c-green/60" />
        {desc}
        {children}
      </div>
    </section>
  );
}

function FolderInner(props: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const param = useSearchParams().get("card");
  const variant: CardVariant =
    param === "chip" || param === "plain" ? param : DEFAULT_VARIANT;
  return <FolderShell variant={variant} {...props} />;
}

export function PrototypeFolderCard(props: {
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
