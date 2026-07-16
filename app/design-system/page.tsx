import type { Metadata } from "next";

import {
  ACCENT_BG,
  ACCENT_BORDER_TOP,
  ACCENT_TEXT,
  MEMBER_ACCENTS,
} from "@/lib/accent";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Design system — Emelbros",
};

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

export default function DesignSystemPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-12 px-6 py-12">
      <header className="flex items-center justify-between">
        <h1 className="font-brand text-4xl text-primary">Emelbros</h1>
        <ThemeToggle />
      </header>

      <section aria-labelledby="brand-signature">
        <h2 id="brand-signature" className="mb-2 text-lg font-extrabold">
          Brand signature — all four together
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          The only place the four brights appear as a set: wordmark, onboarding
          art, milestone celebrations. Never spread across functional chrome.
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
          Each member owns one of the four brights as identity flavour. It tints
          avatar, name pill, and widget top-rule — never buttons, so action
          stays pink for everyone.
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
  );
}
