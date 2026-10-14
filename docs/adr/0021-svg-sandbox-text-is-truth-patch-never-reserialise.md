# SVG Sandbox: the text is the source of truth; canvas edits patch it, never re-serialise

The SVG Sandbox Tool syncs a code pane and a live preview in both directions. The text is the only model. There is no parsed document the canvas edits and prints back out.

Decided while resolving [#202](https://github.com/Temel00/emelbros-app/issues/202) under map [#194](https://github.com/Temel00/emelbros-app/issues/194).

## Decision

- **Patch, never re-serialise.** A canvas draw action emits a shape descriptor; a pure function turns it into one element string; one CodeMirror transaction inserts it. Nothing else in the document is touched, so hand-written formatting, comments and attribute order survive. No parse-then-print path exists.
- **New shapes append as the last child of the root `<svg>`**, on their own line before the final `</svg>`, indentation matched to the previous sibling (else 2 spaces). In SVG, later elements paint on top, so new shapes start on top. The caret and focus stay where they were. Forward/backward reordering is a later phase and will move text lines.
- **Draw tools are disabled while the text is invalid** (hint shown): there is no reliable `</svg>` offset in broken text.
- **Shape output:** coordinates mapped to viewBox units; integers when viewBox width is >= 100, else 2 decimals. Presentation attributes only. Rect/ellipse: random `fill` (hue spread around the colour wheel, fixed saturation/lightness, written as hex), no stroke. Line: random `stroke`, `stroke-width="2"`. Text: black `fill`, typed in an inline input at the click point, committed on Enter/blur, XML-escaped, empty inserts nothing.
- **Hot-reload contract:** 150ms debounce; strict parse (`saxes`); DOMPurify (svg profile) then inline render; on invalid text keep the last good render with a "showing last valid" marker and a line:col error banner that clears on the next valid parse; the preview never writes into the editor; draw actions re-render immediately, skipping the debounce; starter SVG plus a debounced `localStorage` draft (try/catch).
- **Undo/redo is owned by CodeMirror's history alone**, capped at ~25 events; canvas insertions are user-event transactions (`input.draw`) and join the same stack; toolbar buttons call the editor's commands. The feedback-loop guard annotation covers only preview-to-text echoes (none in v1).
- **Parser surface in v1 is minimal:** valid/invalid, line/col on error, and the offset of the root close tag. The element-to-source range map is built in the selection phase.

## Considered Options

- **Re-serialise from a parsed model** (canvas edits a model, the whole text is regenerated): rejected. It normalises whitespace, comments and attribute order, clobbering hand-written code, and gives the canvas a second source of truth.
- **Insert into the element at the caret / nested placement:** rejected for v1. It needs the range map and invites ambiguity; root-last is predictable.
- **A separate undo stack for shapes:** rejected. It would interleave incorrectly with typed edits.

## Consequences

Later phases (selection, move/resize, reordering, style inspector) must also be expressed as text patches against source ranges, not model mutations. That is why the range map is built then, from the same `saxes` offsets. Canvas operations cannot repair invalid code; they pause until it parses.

## Amendments (as shipped)

Reconciled against the merged implementation under [#211](https://github.com/Temel00/emelbros-app/issues/211). The decision stands; these are the deviations and details.

- **Parser surface is slightly wider than "minimal":** besides valid/invalid, line/col and the root close-tag offset, `parseSvg` returns the `viewBox`, whether the root is self-closing, and the offset of the last child (for matching indentation). The element-to-source range map is still deferred.
- **Draw and text tools are also disabled when there is no `viewBox`** (hint "Add a viewBox to draw"), since coordinates cannot be mapped to viewBox units. The validity check is re-run against the live editor text at insert time, because the preview's error state lags by the debounce.
- **Canvas insertions use `isolateHistory: "full"`** alongside the `input.draw` user event, so each draw is its own undo step and never merges with typing. They remain on CodeMirror's single history stack (`minDepth: 25`).
- **Text sizing:** `font-size` is a tenth of the viewBox height (minimum 1). Sanitising is DOMPurify's svg + svgFilters profiles minus `foreignObject`/`script`/`style`, with non-`#fragment` `href`/`url()` references stripped.
- **Draft:** `localStorage` key `dev-tools:svg-sandbox:draft`, saved on a 500ms debounce.
