import type { Metadata } from "next";
import { Suspense } from "react";

import {
  ACCENT_BG,
  ACCENT_BORDER_TOP,
  ACCENT_TEXT,
  MEMBER_ACCENTS,
} from "@/lib/accent";
import {
  isVariantKey,
  VARIANT_KEYS,
  VARIANTS,
  type VariantKey,
} from "@/components/prototype/header-variants";
import { PrototypeSwitcher } from "@/components/prototype/prototype-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Design system — Emelbros",
};

/**
 * PROTOTYPE (#68) — throwaway. Widths chosen to bracket the real cases: the
 * narrowest phone still in the wild, the modern iPhone, a large phone, and
 * the tablet width where `max-w-3xl` stops being the constraint.
 */
const FRAMES = [
  { width: 320, label: "320 — narrowest phone" },
  { width: 390, label: "390 — iPhone" },
  { width: 430, label: "430 — large phone" },
  { width: 768, label: "768 — tablet" },
] as const;

function HeaderFrames({ variant }: { variant: VariantKey }) {
  const render = VARIANTS[variant].render;
  return (
    <div className="flex flex-col gap-8">
      {(["light", "dark"] as const).map((scheme) => (
        <div key={scheme} className="flex flex-col gap-3">
          <p className="text-xs font-bold tracking-wide uppercase">
            {scheme} ground
          </p>
          <div className="flex flex-col gap-4 overflow-x-auto">
            {FRAMES.map((frame) => (
              <div key={frame.width} className="flex flex-col gap-1">
                <p className="font-mono text-[11px] text-muted-foreground">
                  {frame.label}
                </p>
                <div
                  className={`${scheme === "dark" ? "dark" : ""} shrink-0 overflow-hidden rounded-lg border border-border bg-background`}
                  style={{ width: frame.width }}
                >
                  <div className="border-b border-border">
                    {render({ accent: "green", displayName: "Tyler" })}
                  </div>
                  {/* A strip of page content so the header is judged against
                      something, not against white space. */}
                  <div className="px-4 py-3">
                    <div className="h-2 w-2/3 rounded bg-muted" />
                    <div className="mt-2 h-2 w-1/2 rounded bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * PROTOTYPE (#68) — all six colour schemes stacked, on both grounds. Colour
 * options only compare properly side by side; flipping between them one at a
 * time hides how differently loud they are.
 */
function SchemeStack() {
  return (
    <div className="flex flex-col gap-8">
      {(["light", "dark"] as const).map((scheme) => (
        <div key={scheme} className="flex flex-col gap-3">
          <p className="text-xs font-bold tracking-wide uppercase">
            {scheme} ground
          </p>
          <div
            className={`${scheme === "dark" ? "dark" : ""} divide-y divide-border overflow-hidden rounded-lg border border-border bg-background`}
          >
            {VARIANT_KEYS.map((key) => (
              <div key={key} className="flex flex-col gap-1 py-1">
                <p className="px-4 pt-1 font-mono text-[11px] text-muted-foreground sm:px-6">
                  {key} — {VARIANTS[key].name}
                </p>
                {VARIANTS[key].render({
                  accent: "green",
                  displayName: "Tyler",
                })}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** The initial avatar across all four member accents. */
function AvatarRow() {
  return (
    <div className="flex items-center gap-4">
      {MEMBER_ACCENTS.map((accent, i) => (
        <span
          key={accent}
          className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-extrabold text-white ${ACCENT_BG[accent]}`}
        >
          {["T", "M", "E", "B"][i]}
        </span>
      ))}
    </div>
  );
}

const BRIGHTS = [
  {
    name: "Pink",
    swatch: "bg-c-pink",
    role: "The single action colour — buttons, links, active nav, focus ring.",
  },
  {
    name: "Yellow",
    swatch: "bg-c-yellow",
    role: "Coding colour — member identity / module category only.",
  },
  {
    name: "Green",
    swatch: "bg-c-green",
    role: "Coding colour — member identity / module category only.",
  },
  {
    name: "Blue",
    swatch: "bg-c-blue",
    role: "Coding colour — member identity / module category only.",
  },
] as const;

const STATUS = [
  { label: "Done", color: "var(--status-done)" },
  { label: "Attention", color: "var(--status-attention)" },
] as const;

export default async function DesignSystemPage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>;
}) {
  const raw = (await searchParams).variant;
  const variant: VariantKey = isVariantKey(raw) ? raw : "A";
  const renderHeader = VARIANTS[variant].render;

  return (
    <>
      {/* PROTOTYPE (#68) — the variant mounted as the real sticky header, so
          it is judged against live content scrolling underneath it. */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        {renderHeader({ accent: "green", displayName: "Tyler" })}
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-12 px-6 py-12">
        <section aria-labelledby="header-lockup">
          <h2 id="header-lockup" className="mb-2 text-lg font-extrabold">
            #68 round three — Head vs Cycle
          </h2>
          <p className="mb-2 text-sm text-muted-foreground">
            Two families, from the two you liked. <strong>A–D are Head</strong>:
            brights on &ldquo;emel&rdquo;, neutral &ldquo;bros&rdquo; — the
            inverse of Tail. <strong>E–F are Cycle</strong>: the round-two
            favourite, plus a faded-tail hybrid.
          </p>
          <p className="mb-2 text-sm text-muted-foreground">
            <strong>Compare A and B on the light ground.</strong> A reads
            &ldquo;white&rdquo; as the theme-aware ink token; B takes it
            literally, and half the wordmark disappears on <code>#f5f6f7</code>.
            That is the whole trade in one pair.
          </p>
          <p className="mb-6 text-sm text-muted-foreground">
            The sticky header above is scheme <strong>{variant}</strong> live —
            cycle with ← / → or the bar at the bottom.
          </p>
          <SchemeStack />
        </section>

        <section aria-labelledby="scheme-detail">
          <h2 id="scheme-detail" className="mb-2 text-lg font-extrabold">
            {variant} — {VARIANTS[variant].name}
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            {VARIANTS[variant].note}
          </p>
          <HeaderFrames variant={variant} />
        </section>

        <section aria-labelledby="avatar">
          <h2 id="avatar" className="mb-2 text-lg font-extrabold">
            The initial avatar, across the four accents
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Carried over from round one&apos;s variant D. Needs a display name,
            which <code>profiles</code> does not have yet — that is #72.
          </p>
          <AvatarRow />
        </section>

        <header className="flex items-center justify-between">
          <h1 className="font-brand text-4xl text-primary">Emelbros</h1>
          <ThemeToggle />
        </header>

        <section aria-labelledby="brand-signature">
          <h2 id="brand-signature" className="mb-2 text-lg font-extrabold">
            Brand signature — all four together
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            The only place the four brights appear as a set: wordmark,
            onboarding art, milestone celebrations. Never spread across
            functional chrome.
          </p>
          <div className="flex h-16 overflow-hidden rounded-lg">
            <div className="flex-1 bg-c-pink" />
            <div className="flex-1 bg-c-yellow" />
            <div className="flex-1 bg-c-green" />
            <div className="flex-1 bg-c-blue" />
          </div>
        </section>

        <section aria-labelledby="palette">
          <h2 id="palette" className="mb-2 text-lg font-extrabold">
            Palette roles
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Neutrals carry ~90% of every screen; colour is the exception that
            draws the eye.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {BRIGHTS.map((bright) => (
              <div key={bright.name} className="flex flex-col gap-2">
                <div className={`h-16 rounded-lg ${bright.swatch}`} />
                <p className="text-sm font-bold">{bright.name}</p>
                <p className="text-xs text-muted-foreground">{bright.role}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="typography">
          <h2 id="typography" className="mb-2 text-lg font-extrabold">
            Typography
          </h2>
          <p className="font-brand mb-2 text-3xl">Bagel Fat One — brand only</p>
          <p className="mb-2 text-base">
            Nunito is the entire UI: headings, body, labels. Rounded terminals
            rhyme with Bagel.
          </p>
          <p className="text-2xl font-extrabold">
            Score: 1,024,395{" "}
            <span className="text-sm font-normal text-muted-foreground">
              (tabular figures)
            </span>
          </p>
        </section>

        <section aria-labelledby="buttons">
          <h2 id="buttons" className="mb-2 text-lg font-extrabold">
            Buttons — pink is the only action colour
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
        </section>

        <section aria-labelledby="status">
          <h2 id="status" className="mb-2 text-lg font-extrabold">
            Semantic status
          </h2>
          <div className="flex flex-wrap gap-3">
            {STATUS.map((status) => (
              <span
                key={status.label}
                className="rounded-full px-3 py-1 text-sm font-bold"
                style={{
                  backgroundColor: `color-mix(in oklch, ${status.color}, transparent 80%)`,
                  color: status.color,
                }}
              >
                {status.label}
              </span>
            ))}
            <span className="rounded-full bg-destructive/10 px-3 py-1 text-sm font-bold text-destructive">
              Destructive
            </span>
          </div>
        </section>

        <section aria-labelledby="accent">
          <h2 id="accent" className="mb-2 text-lg font-extrabold">
            Per-member accent — identity surfaces only
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Each member owns one of the four brights as identity flavour. It
            tints avatar, name pill, and widget top-rule — never buttons, so
            action stays pink for everyone.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {MEMBER_ACCENTS.map((accent) => (
              <div
                key={accent}
                className={`flex flex-col gap-3 rounded-lg border-t-4 bg-card p-4 ${ACCENT_BORDER_TOP[accent]}`}
              >
                <div className={`size-10 rounded-full ${ACCENT_BG[accent]}`} />
                <p
                  className={`text-sm font-bold capitalize ${ACCENT_TEXT[accent]}`}
                >
                  {accent}
                </p>
                <Button size="sm">Log a game</Button>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Suspense>
        <PrototypeSwitcher
          variants={VARIANT_KEYS}
          names={Object.fromEntries(
            VARIANT_KEYS.map((k) => [k, VARIANTS[k].name]),
          )}
          current={variant}
        />
      </Suspense>
    </>
  );
}
