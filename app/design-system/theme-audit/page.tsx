import type { Metadata } from "next";

import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Theme audit — Emelbros",
};

/**
 * Throwaway prototype for wayfinder ticket #69 — NOT product code.
 *
 * Renders three candidate token treatments side by side against the same
 * three real screens (dashboard card, darts board, list row), because
 * swatches lie and components do not. Delete once #69 resolves.
 *
 * Every hex here is derived, not eyeballed: the "ink" cuts are each bright
 * darkened in OKLCH — hue and chroma held at the artwork's values, lightness
 * dropped — until it clears 4.5:1 against #ffffff (the card, which is the
 * harsher of the two light grounds). See the INK comment for why not HSL.
 */

type Treatment = {
  id: string;
  name: string;
  pitch: string;
  amends18: string;
  vars: Record<string, string>;
};

/** Artwork-exact brights, read out of public/brand/logo_v1.3_FullColor.svg. */
const ART = {
  pink: "#ef476f",
  yellow: "#ffd166",
  green: "#06d6a0",
  blue: "#118ab2",
  ink: "#073b4c",
};

/**
 * Each bright darkened to 4.5:1 on white — computed in OKLCH, holding the
 * artwork's hue and chroma fixed and dropping lightness only.
 *
 * The first pass did this in HSL and the pink came out reading red, which is
 * a real failure mode and not a matter of taste: HSL darkening drifted it
 * +6.9° of hue toward red AND raised chroma 14% (#ef476f -> #e91447). Hue and
 * chroma are perceptually meaningless in HSL, so "same hue, less lightness"
 * simply isn't what the space does. OKLCH holds both, so #db325f is the same
 * pink as the logo, only darker.
 */
const INK = {
  pink: "#db325f",
  yellow: "#9a6f00",
  green: "#008858",
  blue: "#0080a8",
};

/**
 * Pink is the one the eye is most sensitive to here, since it does the most
 * work in direction A. This ladder walks OKLCH hue away from the artwork
 * toward magenta at constant lightness/chroma, so the exact pink can be
 * chosen by eye rather than argued about. All rungs clear 4.5:1 on white.
 */
const PINK_LADDER = [
  { hex: "#db325f", note: "hue-locked to artwork (0°)" },
  { hex: "#da3369", note: "−4° — a touch pinker" },
  { hex: "#d83372", note: "−8° — clearly pinker" },
  { hex: "#d6347b", note: "−12° — pinker still" },
  { hex: "#d43685", note: "−16° — approaching magenta" },
];

const TREATMENTS: Treatment[] = [
  {
    id: "a",
    name: "A — Two-tier palette",
    pitch:
      "The four brights stay artwork-exact and become fill-and-shape colours only. A parallel set of darker cuts (--c-*-ink) carries all text and all filled buttons. Pink stays the action colour.",
    amends18:
      "No amendment — every rule in #18 survives, gaining a second tier.",
    vars: {
      "--c-pink": ART.pink,
      "--c-yellow": ART.yellow,
      "--c-green": ART.green,
      "--c-blue": ART.blue,
      "--p-primary": INK.pink,
      "--p-primary-fg": "#ffffff",
      "--p-link": INK.pink,
      "--p-ring": INK.pink,
      "--p-destructive": INK.pink,
      "--p-chip-1": ART.blue,
      "--p-chip-2": ART.green,
      "--p-chip-3": ART.yellow,
      "--p-fg": ART.ink,
    },
  },
  {
    id: "b",
    name: "B — Light-cut brights",
    pitch:
      "No second tier. In light mode --c-* IS the darker cut, exactly as .dark already re-tints the brights upward today. One token per colour, symmetric with the dark theme. Cost: on-screen pink no longer equals logo pink.",
    amends18:
      "Amends #18 — the canonical hexes become mode-dependent rather than fixed.",
    vars: {
      "--c-pink": INK.pink,
      "--c-yellow": INK.yellow,
      "--c-green": INK.green,
      "--c-blue": INK.blue,
      "--p-primary": INK.pink,
      "--p-primary-fg": "#ffffff",
      "--p-link": INK.pink,
      "--p-ring": INK.pink,
      "--p-destructive": INK.pink,
      "--p-chip-1": INK.blue,
      "--p-chip-2": INK.green,
      "--p-chip-3": INK.yellow,
      "--p-fg": ART.ink,
    },
  },
  {
    id: "c",
    name: "C — Blue action, pink signature",
    pitch:
      "Breaks pink's monopoly. Blue drives every action (buttons, links, focus, active nav); pink retreats to the brand mark and destructive only — so pink reads as 'this is Emelbros' or 'this deletes', never both at once.",
    amends18:
      "Amends #18 — overturns 'pink is the single action colour', its central rule.",
    vars: {
      "--c-pink": ART.pink,
      "--c-yellow": ART.yellow,
      "--c-green": ART.green,
      "--c-blue": ART.blue,
      "--p-primary": INK.blue,
      "--p-primary-fg": "#ffffff",
      "--p-link": INK.blue,
      "--p-ring": INK.blue,
      "--p-destructive": INK.pink,
      "--p-chip-1": ART.yellow,
      "--p-chip-2": ART.green,
      "--p-chip-3": ART.pink,
      "--p-fg": ART.ink,
    },
  },
];

function Ratio({ value, label }: { value: number; label: string }) {
  const pass = value >= 4.5;
  const large = value >= 3 && value < 4.5;
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium"
      style={{
        background: pass ? "#dcfce7" : large ? "#fef9c3" : "#fee2e2",
        color: pass ? "#14532d" : large ? "#713f12" : "#7f1d1d",
      }}
    >
      {label} {value.toFixed(2)} {pass ? "AA" : large ? "large" : "fail"}
    </span>
  );
}

/** Screen 1: a dashboard card — the primary button is the whole point. */
function DashboardScreen() {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: "#ffffff", borderColor: "#dee1e3" }}
    >
      <div className="flex items-center justify-between">
        <h4
          className="font-heading text-sm font-bold"
          style={{ color: "var(--p-fg)" }}
        >
          Tonight&rsquo;s darts
        </h4>
        <span className="text-[11px]" style={{ color: "#5b6b70" }}>
          2 players
        </span>
      </div>
      <p className="mt-1 text-xs" style={{ color: "#5b6b70" }}>
        501, double out. Last game finished 4 days ago.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          className="rounded-md px-3 py-1.5 text-xs font-semibold"
          style={{
            background: "var(--p-primary)",
            color: "var(--p-primary-fg)",
          }}
        >
          Start a game
        </button>
        <button
          className="rounded-md border px-3 py-1.5 text-xs font-semibold"
          style={{ borderColor: "#dee1e3", color: "var(--p-fg)" }}
        >
          History
        </button>
        <a
          className="text-xs font-semibold underline underline-offset-2"
          style={{ color: "var(--p-link)" }}
          href="#"
        >
          Edit players
        </a>
      </div>
      <div className="mt-3 flex gap-1.5">
        {["Ty", "Sam", "Alex"].map((n, i) => (
          <span
            key={n}
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{
              background: `var(--p-chip-${i + 1})`,
              color: "#073b4c",
            }}
          >
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Screen 2: the darts rings — these fills carry MEANING, not decoration. */
function DartsScreen({ redundant }: { redundant: boolean }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: "#ffffff", borderColor: "#dee1e3" }}
    >
      <h4
        className="font-heading text-sm font-bold"
        style={{ color: "var(--p-fg)" }}
      >
        Scoring rings
      </h4>
      <div className="mt-3 flex gap-2">
        {[
          { k: "Single", bg: "#ffffff", fg: "var(--p-fg)", mark: "" },
          { k: "Double", bg: "var(--c-green)", fg: "#073b4c", mark: "×2" },
          { k: "Treble", bg: "var(--c-blue)", fg: "#ffffff", mark: "×3" },
        ].map((r) => (
          <div
            key={r.k}
            className="flex flex-1 flex-col items-center justify-center rounded-lg border py-3"
            style={{ background: r.bg, borderColor: "#dee1e3", color: r.fg }}
          >
            <span className="text-[11px] font-semibold">{r.k}</span>
            {redundant && r.mark ? (
              <span className="mt-0.5 text-base font-black">{r.mark}</span>
            ) : null}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px]" style={{ color: "#5b6b70" }}>
        {redundant
          ? "With the ×2 / ×3 label: meaning survives when the hues collapse."
          : "Colour-only: double and treble sit at 1.06:1 under tritanopia in dark mode."}
      </p>
    </div>
  );
}

/** Screen 3: a list — status colour on small text is the hardest case. */
function ListScreen() {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: "#ffffff", borderColor: "#dee1e3" }}
    >
      <h4
        className="font-heading text-sm font-bold"
        style={{ color: "var(--p-fg)" }}
      >
        Groceries
      </h4>
      <ul className="mt-2 space-y-1.5">
        {[
          { t: "Oat milk", done: true },
          { t: "Birthday candles", done: false },
          { t: "Dog food", done: false },
        ].map((it) => (
          <li key={it.t} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block size-3 rounded-sm"
              style={{
                background: it.done ? "var(--c-green)" : "transparent",
                border: `1.5px solid ${it.done ? "var(--c-green)" : "#dee1e3"}`,
              }}
            />
            <span
              style={{
                color: it.done ? "#5b6b70" : "var(--p-fg)",
                textDecoration: it.done ? "line-through" : "none",
              }}
            >
              {it.t}
            </span>
          </li>
        ))}
      </ul>
      <button
        className="mt-3 text-[11px] font-semibold"
        style={{ color: "var(--p-destructive)" }}
      >
        Clear completed
      </button>
    </div>
  );
}

export default function ThemeAuditPage() {
  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-brand text-3xl">
            Theme audit — three directions
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Prototype for{" "}
            <a
              className="underline"
              href="https://github.com/Temel00/emelbros-app/issues/69"
            >
              #69
            </a>
            . Each column is a candidate token treatment rendered against the
            same three screens. Throwaway — delete when the ticket resolves.
          </p>
        </div>
        <ThemeToggle />
      </div>

      <section className="mt-8 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
        <h2 className="font-heading text-base font-bold">
          What the audit found first
        </h2>
        <ul className="mt-2 space-y-1 text-sm">
          <li>
            <strong>The shipped primary button fails AA today.</strong> White on{" "}
            <code>#ef486f</code> is <Ratio value={3.6} label="" /> — the single
            most-pressed control in the app.
          </li>
          <li>
            <strong>Every token is a typo of the artwork.</strong> pink{" "}
            <code>#ef486f</code> vs <code>#ef476f</code>, green{" "}
            <code>#05d69e</code> vs <code>#06d6a0</code>, blue{" "}
            <code>#1089b1</code> vs <code>#118ab2</code>. Yellow alone matches.
          </li>
          <li>
            <strong>Light mode is the whole problem; dark mode is fine.</strong>{" "}
            All four brights clear AA on the dark ground (6.3–12.7). On the
            light ground: yellow 1.33, green 1.75, pink 3.33, blue 3.71.
          </li>
          <li>
            <strong>Double and treble collapse under tritanopia</strong> —
            1.06:1 in dark mode, and they carry meaning with no redundant
            encoding.
          </li>
        </ul>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {TREATMENTS.map((t) => (
          <section
            key={t.id}
            style={t.vars as React.CSSProperties}
            className="rounded-2xl border p-4"
          >
            <h3 className="font-heading text-lg font-bold">{t.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t.pitch}</p>
            <p className="mt-2 text-[11px] font-semibold">{t.amends18}</p>
            <div className="mt-4 space-y-4">
              <DashboardScreen />
              <DartsScreen redundant={t.id === "c"} />
              <ListScreen />
            </div>
          </section>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="font-heading text-lg font-bold">Pick the action pink</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Direction A needs one darker pink to carry filled buttons. The first
          attempt (<code>#e91447</code>) read red, because darkening in HSL
          drifted the hue <strong>+6.9° toward red</strong> and raised chroma{" "}
          <strong>14%</strong>. Recomputed in OKLCH — which holds hue and chroma
          as the eye actually sees them — <code>#db325f</code> is the same pink
          as the logo, only darker. The ladder walks further toward magenta if
          you want it pinker than the artwork. Every rung clears 4.5:1.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <div
              className="flex h-16 w-40 items-center justify-center rounded-lg text-xs font-semibold"
              style={{ background: ART.pink, color: "#073b4c" }}
            >
              artwork
            </div>
            <span className="text-[11px] text-muted-foreground">
              {ART.pink} — fails on white
            </span>
          </div>
          <div
            className="w-px self-stretch"
            style={{ background: "#dee1e3" }}
            aria-hidden
          />
          {PINK_LADDER.map((p) => (
            <div key={p.hex} className="flex flex-col gap-1">
              <button
                className="h-16 w-40 rounded-lg text-xs font-semibold"
                style={{ background: p.hex, color: "#ffffff" }}
              >
                Start a game
              </button>
              <span className="text-[11px] text-muted-foreground">
                {p.hex} — {p.note}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-lg font-bold">
          The neutrals question, separately
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          The artwork carries a fifth colour, <code>#073b4c</code>, which the
          shipped <code>--foreground</code> (<code>#0e2a31</code>) does not
          match. Both pass contrast (11.16 vs 13.92), so this is a
          brand-fidelity call, not an accessibility one.
        </p>
        <div className="mt-3 flex gap-3">
          {[
            { h: "#0e2a31", l: "shipped ink" },
            { h: "#073b4c", l: "artwork ink" },
          ].map((n) => (
            <div
              key={n.h}
              className="flex-1 rounded-lg p-4"
              style={{ background: n.h, color: "#f5f6f7" }}
            >
              <div className="text-sm font-semibold">{n.l}</div>
              <div className="text-xs opacity-80">{n.h}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
