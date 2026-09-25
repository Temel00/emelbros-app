# Nutrition decorative flair: a scoped exception to the #18 colour-usage discipline, plus graduated folder-surface tokens

The Nutrition module ships a module-level decorative background — a scattered field of tinted produce vectors — that uses **all four #18 brights as a set, decoratively**. [#18](https://github.com/Temel00/emelbros-app/issues/18) reserves the four-bright set for the brand signature only (wordmark, onboarding art, milestone celebrations), never functional chrome. This ADR **amends** that discipline with one narrow, guard-railed exception for Nutrition, and graduates the folder-card surface colours the prototype left as literals into named theme-aware tokens.

Decided while resolving [#188](https://github.com/Temel00/emelbros-app/issues/188) under map [#184](https://github.com/Temel00/emelbros-app/issues/184), triggered by the settled visual treatment in [#187](https://github.com/Temel00/emelbros-app/issues/187). Primary source for the visual decision: branch `prototype/nutrition-flair-187` @ `13ad777`. Amends the colour-usage system locked in #18; the brights, neutrals, and per-member `accent` model are otherwise unchanged.

## Decision

### 1. Sanction the Nutrition decorative flair layer as a scoped exception

Rule 1 of the #18 colour-usage system ("all four together = the brand signature — only as a set; never spread across functional chrome") is amended to permit **one** additional use of the four-bright set: a **module-level decorative background layer**, subject to all of the following guardrails. The exception is **Nutrition-bespoke**; it does not generalise.

A conforming decorative flair layer:

- **Is decorative, not chrome.** It carries no information and no interaction — `aria-hidden="true"` and `pointer-events-none`. It is invisible to assistive tech and never intercepts input.
- **Sits behind an opaque content surface.** Body text and controls render on an **opaque** surface (the folder card and the opaque inner cards), so the flair is never *behind* text. It shows only in the gutter framing that surface. **AA body-text contrast is therefore untouched** — it is measured against the opaque surface, not the flair.
- **Stays faint.** `opacity-[0.10]` in light, `dark:opacity-[0.14]` in dark. These are the ceiling for this exception, not a starting point.
- **Tints via the #18 tokens.** Single-fill `currentColor` vectors coloured through the theme-aware `text-c-*` bright tokens — no new colour values, no per-theme branching at the call site.

Neutrals still carry ~90% of every Nutrition surface (rule 2), pink remains the sole action colour (rule 3), and yellow/green/blue keep their coding role on functional surfaces (rule 4). The exception adds a decorative layer *beneath* that system; it does not relax it.

**This is not blanket permission.** A future module may cite this ADR only by meeting **every** guardrail above (decorative + `aria-hidden` + `pointer-events-none` + opacity ceiling + opaque content surface + `text-c-*` tinting) — and doing so is a *new* decision that revisits this ADR, not an entitlement. Any use of the four-bright set that touches functional chrome, drops below the opaque surface behind text, or exceeds the opacity ceiling is **outside** this exception and still governed by unamended #18.

### 2. Graduate the folder-card surfaces to named theme-aware tokens

The prototype's manila (light) / blue (dark) folder surfaces were hardcoded Tailwind arbitrary literals (`bg-[#f4ead0] dark:bg-[#21323f]`, …) in one component. They **graduate into named theme-aware tokens** in `app/globals.css`, following the exact `--c-*` pattern already used for the brights: raw values under `:root` and `.dark`, exposed to Tailwind via `@theme inline`, so consumers never branch on light/dark themselves.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--c-surface-folder` | `#f4ead0` | `#21323f` | folder-card fill (active tab + body) |
| `--c-surface-folder-border` | `#e2d4ad` | `#33495c` | folder-card + tab border |
| `--c-surface-tab-inactive` | `#e9dcb6` | `#1a2833` | inactive nav-tab fill |

Wired the #18 way:

```css
/* :root */
--c-surface-folder: #f4ead0;
--c-surface-folder-border: #e2d4ad;
--c-surface-tab-inactive: #e9dcb6;

/* .dark */
--c-surface-folder: #21323f;
--c-surface-folder-border: #33495c;
--c-surface-tab-inactive: #1a2833;

/* @theme inline */
--color-c-surface-folder: var(--c-surface-folder);
--color-c-surface-folder-border: var(--c-surface-folder-border);
--color-c-surface-tab-inactive: var(--c-surface-tab-inactive);
```

Usage: `bg-c-surface-folder`, `border-c-surface-folder-border`, `bg-c-surface-tab-inactive`.

These tokens are **currently Nutrition-bespoke** — the folder card is their only consumer. The generic `surface-` name does not license reuse elsewhere; a second consumer is a fresh decision that revisits whether the value is a real platform surface or should be renamed. Defining them centrally is the repo's house style for *how theme-aware colour is expressed*, not a cross-module mechanism (which map #184 rules out of scope).

## Considered options

- **Keep the folder surfaces as Nutrition-local literals** (`bg-[#f4ead0] dark:bg-[#21323f]`, as prototyped). Rejected: theme-aware + multi-state (fill, border, inactive tab) + multi-screen use is exactly when a token earns its place. Literals re-branch light/dark at every call site — the precise thing #18's token layer exists to prevent — and duplicate the hexes across the build tickets.
- **Reuse the existing neutral `--card` / `--border` tokens; no bespoke surface colour.** Rejected: this discards the manila/blue folder identity the owner converged on across the #187 prototype rounds. The distinct warm-in-light / blue-in-dark folder tone is the point of the treatment, not incidental.
- **No exception — restyle the flair to avoid the four-bright set** (e.g. a single bright, or neutrals only). Rejected: #187 settled that the four-bright produce field *as a set* is the treatment the owner picked; stripping it to satisfy unamended #18 would discard the settled decision. The guard-railed exception preserves the treatment without loosening the discipline on functional chrome.
- **A reusable cross-module flair mechanism** (shared component / manifest field). Out of scope per map #184 — this effort is Nutrition-bespoke; generalising is a later effort if the shape proves out.

## Consequences

- **`app/globals.css`** gains the three `--c-surface-*` tokens (raw + `@theme inline`), added as the first step of the folder-card build ([#190](https://github.com/Temel00/emelbros-app/issues/190)), which then swaps the prototype's arbitrary literals for the token classes. The flair-background build ([#189](https://github.com/Temel00/emelbros-app/issues/189)) needs no surface token — it tints produce through the existing `text-c-*` brights.
- **Every build ticket under #184 inherits the guardrails** in section 1 as an acceptance condition: `aria-hidden` + `pointer-events-none` on the flair layer, opacity `0.10` / `0.14`, opaque content surface, and an explicit WCAG-AA body-text contrast pass in **both** themes (checked against the opaque folder surface, not the flair).
- **`CONTEXT.md`** gains a pointer to this ADR alongside its existing #18 reference, so the amendment is discoverable from the domain model.
- The exception is deliberately hard to cite: a future module wanting decorative brights must satisfy every guardrail and revisit this ADR. That friction is intentional — it keeps #18's "brights as a set = brand signature" discipline intact everywhere the guardrails are not met.
