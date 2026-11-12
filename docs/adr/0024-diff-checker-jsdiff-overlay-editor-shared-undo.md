# Diff Checker: jsdiff, highlights behind a transparent text box, one shared undo history

The Diff Checker Tool compares two pasted texts and highlights the differences inside the text boxes while the user edits. Three choices are hard to reverse and surprising without context: the diff engine, the in-place highlighting technique, and the undo history.

Decided while resolving [#240](https://github.com/Temel00/emelbros-app/issues/240) under map [#237](https://github.com/Temel00/emelbros-app/issues/237). Research: `research/diff-checker-engine` branch. Prototypes: `prototype/diff-checker-239` (variants A-G; **G** chosen).

## Decision

- **Engine: jsdiff (`diff` 9.x).** `diffLines` for the line pass, `diffChars` for paired changed lines. Lines are paired index-wise within each run of removed/added lines; leftovers are plain removed or added lines.
- **Pure core, separate from the UI.** `modules/dev-tools/tools/diff-checker/lib/` holds the compare function, status derivation, summary counts and the undo history. No React, no DOM. These are the unit-tested seams.
- **Editing surface: a transparent `<textarea wrap="off">` laid over a backdrop `div`** with identical font, padding and line height. The backdrop renders the same lines with highlight spans and transparent text; the textarea owns caret, selection and input. Scroll is synced textarea to backdrop and box to box (one box scrolls, the other follows). Highlights are shown only when the debounced diff is current, so they never sit on stale lines.
- **Line endings:** CRLF and LF are always the same (normalised to LF before comparing). This is the only silent normalisation; browsers already normalise textarea line endings, so a CRLF difference cannot be typed or seen anyway. Everything else is a difference unless the user turns an ignore toggle on.
- **Ignore toggles:** whitespace and case, off by default. jsdiff's `diffLines` has no case option, so ignore-case lowercases both inputs for the line diff and the display text always comes from the original lines. Ignore-whitespace also ignores a missing final newline. No other ignore options in v1.
- **Counts:** _added_ = lines only on Changed, _removed_ = lines only on Original, _changed_ = lines on both sides that differ. Shown as `+a −r ~c`; the indicator says "N differing lines" with N the sum.
- **Live and debounced** at 250ms after the last edit or option change. Indicator states: empty, waiting for the other side, comparing, identical, N differing lines, too large to compare. Announced politely to assistive tech; counts are in the indicator text because the highlight layer is `aria-hidden`.
- **Large input:** jsdiff `timeout` of about 2s; on timeout the highlights clear and the indicator says "Too large to compare". Character highlighting is skipped on lines over about 2,000 characters. The diff stays on the main thread in v1.
- **Differences are not signalled by colour alone** (an underline or equivalent second cue on changed characters), on platform tokens, in both themes.
- **Undo/redo: one shared history over both boxes, owned by us, not the browser.** Snapshots of `{original, changed}`; Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl+Y are intercepted, as is the `beforeinput` history type, so the native per-textarea stack never also fires. Typing within 500ms merges into one step; swap, clear and paste are one step each; a new edit clears redo; option toggles are not in the history. The history lives in memory and is gone when the page is left. It is capped by total characters (about 2 million, oldest dropped first, always keeping at least the last 3 steps), not by step count. After undo or redo, focus returns to the box that last changed. Undo and Redo icon buttons (tooltip and accessible name) sit centred below the boxes.
- **Layout (variant G):** Original title left, Changed right-aligned, an icon-only Swap centred between the headers; per-side icon-only Copy and Clear; options (highlight line, highlight character, ignore whitespace, ignore case) in a left drawer, closed by default, with an "N ignore options on" hint when any ignore is active. Stacked on phones, side by side from `sm`.
- **Out of v1:** file load, persistence, unified view, copy-as-patch, next/previous-difference navigation.

## Considered Options

- **diff-match-patch-es:** faster on line-only diffs, but weaker character diff ergonomics and options. Kept as the fallback if jsdiff's worst case proves a problem.
- **Aligned read-only compare view with separate edit mode (variants A-D, round 1):** rejected. Users wanted a single text box that highlights as they edit.
- **Per-textarea native undo:** rejected. It is per box, and swap and clear (programmatic changes) wipe it.
- **A fixed 10-step undo cap:** rejected in favour of a size cap; step count is not what exhausts memory.
- **`contenteditable` with inline highlight spans:** rejected. Paste handling, caret restoration and IME behaviour are all worse than a plain textarea.

## Consequences

The backdrop and the textarea must keep identical metrics; any change to font, padding or wrapping on one must be made on the other, and long lines scroll horizontally (`wrap="off"`) rather than wrap. Highlighting lags typing by the debounce. Undo is entirely ours, so any future input path (file load, drag-and-drop) must go through the same history push.
