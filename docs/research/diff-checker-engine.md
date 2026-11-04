# Diff engine for the Diff Checker Tool (line + intra-line char diff, client-side)

Research for issue #238 (part of #237). Sources: npm registry metadata (`npm view`), each package's own README/type definitions as shipped in the tarball, and measurements made locally by bundling and running the published packages (Node v24, esbuild `--bundle --minify`, gzip -9). Benchmarks are single-run, synthetic, on one dev machine: treat as order-of-magnitude.

## Candidates

| | jsdiff (`diff`) 9.0.0 | diff-match-patch-es 2.0.1 | diff-match-patch 1.0.5 (original port) | fast-myers-diff 3.2.0 (Myers baseline) |
|---|---|---|---|---|
| Licence | BSD-3-Clause | Apache-2.0 | Apache-2.0 | MIT |
| Maintenance | Last publish 2026-04-13; regular releases (8.0.2 May 2025, 8.0.3 Jan 2026, 8.0.4 Mar 2026, 9.0.0 Apr 2026) | Last publish 2026-08-10 (antfu) | Last publish 2022-06-15; stale | Last publish 2024-01-12 |
| Types | Bundled (`libcjs/index.d.ts`, overloads for abortable options) | Bundled (`index.d.mts`) | None bundled (needs `@types/diff-match-patch`) | Bundled |
| Gzipped, tree-shaken (only the diff fns) | 2.7 KB (`diffLines`+`diffChars`+`diffWordsWithSpace`); 8.3 KB whole library | 3.0 KB (`diffMain`) | Not measured: CJS class, does not bundle as ESM with esbuild default; not tree-shakeable | 1.9 KB |
| Line diff | `diffLines` | Manual: `diffLinesToChars` -> `diffMain` -> `diffCharsToLines`, then `diffCleanupSemantic` | same | Generic: diffs arrays; you split lines yourself |
| Char diff | `diffChars`, `diffWords`, `diffWordsWithSpace` | `diffMain` on strings | same | Diffs strings/arrays (char-level works, no word tokenizer) |
| Ignore case | `ignoreCase` option (chars/words/lines) | None built in; lowercase inputs yourself | None | Custom `eq(i,j)` comparator |
| Ignore whitespace | `ignoreWhitespace` on `diffLines` / words | None built in; normalise inputs | None | Custom `eq` comparator |
| Abort on huge input | `timeout` and `maxEditLength` options; returns `undefined` when exceeded | `diffTimeout` option (default 1 s) then returns a coarser but valid diff | `Diff_Timeout` | None; run in a Worker |
| Output shape | `{value,count,added,removed}[]` hunks (line-granular) | `[op,text][]` | same | Iterator of `[sx,ex,sy,ey]` index ranges |

Notes on the claims:
- jsdiff option names/behaviour: README (`ignoreCase`, `ignoreWhitespace`, `newlineIsToken`, `ignoreNewlineAtEof`, `maxEditLength`, `timeout`). When tokens are equal only under an option, `value` comes from the *new* string, which matters for rendering ignore-case diffs.
- jsdiff `ignoreWhitespace` is documented for `diffLines` and word diffs; its README warns the combination with `newlineIsToken` can give unexpected results for blank lines. Use `ignoreWhitespace` without `newlineIsToken`.
- fast-myers-diff signatures from `bin/index.d.ts`: `diff(xs, ys, eq?)` yields index-range tuples, which map directly onto aligned rows without re-splitting values.

## Measured performance (local, one run each)

Lines are ~40 chars. "Changed" is the fraction of lines altered.

| Scenario | jsdiff `diffLines` | dmp-es (lines->chars) | fast-myers-diff |
|---|---|---|---|
| 5k lines, 1% changed | 5 ms | 5 ms | 2 ms |
| 5k lines, 50% changed | 1110 ms | 208 ms | 145 ms |
| 20k lines, 1% changed | 16 ms | 15 ms | 10 ms |
| 20k lines, 50% changed | 21130 ms | 1010 ms | 2382 ms |
| 3k lines, 100% different | 817 ms (aborts in 50 ms with `maxEditLength: 1000`) | 156 ms | 79 ms |
| 2 KB single line, char diff | 219 ms (`diffChars`) | 29 ms | not run |

Takeaway: all three are fine on realistic inputs (mostly-similar text). jsdiff degrades worst on heavily divergent large inputs (O(ND)); dmp's line-to-char-code trick plus its timeout keeps it bounded. jsdiff's `timeout`/`maxEditLength` give an explicit way to bail out and show "too different to diff".

## Fit for a side-by-side renderer

Renderer needs: ordered hunks, pairing of removed/added blocks into rows, then a char diff on each paired line.

- jsdiff: `diffLines` returns hunks with `count`; a removed hunk immediately followed by an added hunk is the natural "changed block" to pair line-by-line, then call `diffChars`/`diffWordsWithSpace` on each pair. One library, one option vocabulary, both levels. Least glue code.
- dmp-es: line diff needs the 3-call dance and `diffCharsToLines`; then `diffMain` per pair plus `diffCleanupSemantic` for readable char runs. No ignore options, so the tool would normalise text itself (and then must map back to original text for display, awkward for ignore-whitespace).
- fast-myers-diff: index ranges are ideal for aligned rows, but ignore-case/whitespace and word-level tokenising are hand-built, and no timeout.
- Hand-rolled Myers: no benefit over fast-myers-diff; skip. Writing, testing and maintaining it only makes sense if bundle size under ~2 KB matters, which it does not here.

## Recommendation

Use **jsdiff (`diff` 9.x)**.
- Only candidate covering line diff, intra-line char/word diff, ignore-case and ignore-whitespace natively, with first-class types.
- Active maintenance, permissive licence, ~2.7 KB gzipped when importing only `diffLines`, `diffChars`/`diffWordsWithSpace` (named imports; confirmed tree-shakes under esbuild).
- Mitigate its weak spot: always pass `timeout` (or `maxEditLength`), handle the `undefined` result with a "inputs too different" message, and consider running the diff in a Web Worker for big pastes. Apply char diff only to paired changed lines, and skip it above a line-length cap.
- Fallback if worst-case speed on large divergent inputs proves unacceptable: swap the line level to diff-match-patch-es (about 5-20x faster in the measurements) while keeping jsdiff for char level, behind the same internal interface.

Caveats: benchmarks are synthetic, single-run, and unmeasured in a browser; verify in-browser before finalising limits. diff-match-patch bundle size was not measured because the original package does not bundle cleanly as ESM and is unmaintained.
