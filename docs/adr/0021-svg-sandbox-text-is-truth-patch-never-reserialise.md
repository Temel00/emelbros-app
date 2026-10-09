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
