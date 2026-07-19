# Brand assets

Handed over for [#66](https://github.com/Temel00/emelbros-app/issues/66).

## Use these

| File | What it is |
| --- | --- |
| `wordmark.svg` | Full "emelbros" lockup, two-line stack, four brights. Text **outlined** — no font dependency. |
| `glyph.svg` | Mark-only pink `e`, derived from the wordmark. viewBox tight to the ink. |

## Do not use these

| File | Why |
| --- | --- |
| `logo_v1.3_FullColor.svg` | Authored Inkscape source. Its text is **live `Bagel Fat One`**, not outlined — it only renders correctly on a machine with the font installed. Kept as the editable original. |
| `logo_v1.3_Glyph.png` | 26×26 raster. Too small for any icon use; superseded by `glyph.svg`. |

## Constraints found while checking these

- **Minimum legible size** — wordmark ≈ 28px tall (at 20px the `bros` counters start closing); glyph ≈ 24px (at 16px the `e` counter nearly closes).
- **On dark** (`--background: #0a1f24`) the blue `#118ab2` recedes to 4.30:1. The dark-theme brights in `app/globals.css` already lift it to 7.17:1, so a dark lockup is a **recolour**, not separate artwork.
- **On light** (`#f5f6f7`) yellow is only 1.33:1 — fine inside the lockup, but never as a standalone mark. Pink is the only bright that holds on both grounds, which is why the glyph is pink.
- The artwork's hexes differ from the `--c-*` tokens in `app/globals.css`; see [#69](https://github.com/Temel00/emelbros-app/issues/69).
