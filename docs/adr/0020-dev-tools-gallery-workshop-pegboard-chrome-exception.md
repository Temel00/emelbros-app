# Dev Tools gallery: workshop pegboard look, with a scoped exception allowing the #18 brights on functional chrome

The Dev Tools gallery home (`/dev-tools`) ships a "workshop pegboard" look: a dotted board holding manila tool tags with peg holes, mono stamped names, and a bright handle stripe and icon tint per card. The brights here tint **functional chrome** (the icon and stripe on a link), which [#18](https://github.com/Temel00/emelbros-app/issues/18) forbids (rule 1: the four-bright set is the brand signature only). [ADR-0018](0018-nutrition-decorative-flair-exception-and-folder-surface-tokens.md) does not cover it either, because it permits decoration only. This ADR is a second, equally narrow exception.

Decided while resolving [#197](https://github.com/Temel00/emelbros-app/issues/197) under map [#194](https://github.com/Temel00/emelbros-app/issues/194), following the owner's choice of Variant C in [#196](https://github.com/Temel00/emelbros-app/issues/196). Primary source: branch `prototype/dev-tools-gallery-196` @ `eae821e`.

## Decision

### Gallery spec

- **Layout:** scrollable grid (not fixed 4×5; it must scale past 20 tools), 2 columns on phones, 3 at `sm`, 4 at `lg`, inside `max-w-5xl`. The grid sits on the dotted board (`--c-surface-tab-inactive` with a dot pattern in `--c-surface-folder-border`).
- **Card anatomy:** the whole card is one link and carries all four manifest fields: Lucide `icon` tinted by a bright, `name` (mono, bold, uppercase), `description` clamped to 2 lines (`line-clamp-2`), a top handle stripe and a peg hole. No badges, buttons, search, categories or hero cards. Cards in a row are equal height; each row has a static ±0.6° alternating tilt.
- **Bright assignment:** stable per Tool, derived from a hash of `slug`. It never depends on array position, so inserting a Tool does not recolour others. No manifest field is added (ADR-0019's manifest stays `{ slug, name, description, icon }`).
- **Motion:** the tilt is static and stays. The hover lift and its transition are `motion-safe:` only.
- **Surfaces:** reuse `--c-surface-folder`, `--c-surface-folder-border`, `--c-surface-tab-inactive` from ADR-0018. No new colour values or tokens.
- **Mobile:** the 2-column grid and whole-card tap target apply; no separate mobile layout.

### Exception to #18 colour-usage rule 1

The four-bright set may be used on the **Dev Tools gallery home only**, as the per-card icon tint (`text-c-*`) and handle stripe (`bg-c-*`), subject to every guardrail:

1. **Gallery home only.** Tool pages (`/dev-tools/[tool]`) and `ToolShell` stay on platform tokens.
2. **Narrow use.** Brights appear only as the icon tint and the handle stripe. Never as text colour, and never as a fill behind text.
3. **Opaque text surface.** Name and description render on the opaque `--c-surface-folder` in `foreground` / `muted-foreground`. WCAG AA body-text contrast is verified in **both** themes against that surface (and icon/stripe non-text contrast against it).
4. **Pink stays the action colour.** The focus ring stays `--ring`; no bright is used to signal a button or state.
5. **Tokens only.** Existing `--c-*` and `--c-surface-*` tokens, no new colour values, no per-theme branching at call sites.
6. **Icons carry no unique information.** Icon and stripe are `aria-hidden`; the name identifies the Tool.

This is not blanket permission. A different surface citing this ADR must meet every guardrail and is a new decision that revisits it. It amends #18 and sits beside ADR-0018; the two exceptions do not combine or generalise.

## Considered options

- **Platform tokens only (Variants A, B).** Rejected by the owner: functional but without the identity they wanted for a growing tool collection.
- **Fixed 4×5 grid (B, D).** Rejected: does not scale beyond 20 tools; forces dropping the description.
- **Cabinet drawers (D).** Rejected by the owner in favour of the pegboard.
- **Index-cycled brights.** Rejected: colours shift when tools are inserted.
- **`accent` field in the Tool manifest.** Rejected: adds manifest surface for a decoration; revisit only if hashed colours clash.
- **Decorative-only brights (satisfy ADR-0018 as is).** Rejected: would remove the icon tint the owner picked.

## Consequences

- The gallery build ticket inherits the six guardrails as acceptance conditions, including the two-theme contrast pass and `motion-safe:` on the hover lift.
- `CONTEXT.md` gains a pointer to this ADR beside ADR-0018.
- The prototype's `_prototype/` folder is throwaway; the real gallery reads the registry from ADR-0019.
