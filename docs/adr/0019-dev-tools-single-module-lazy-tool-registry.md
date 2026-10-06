# Dev Tools is one Module; Tools are lazy-loaded entries in a module-internal registry

The platform ships many small client-side utilities (an SVG sandbox first, 20+ expected). They are **one Module**, `dev-tools`, not one module each. Each utility is a **Tool** inside it: no launcher tile, no scopes, no tables, no widgets of its own.

Decided while resolving [#195](https://github.com/Temel00/emelbros-app/issues/195) under map [#194](https://github.com/Temel00/emelbros-app/issues/194).

## Decision

- **Module Manifest** (`modules/dev-tools/manifest.ts`, registered in `modules/index.ts` as usual, ADR-0001): `scopes: []`, `widgets: []`, `profileSections: []`. The platform sees Dev Tools as any other module; it never learns about Tools.
- **Tool manifest** — per tool, `modules/dev-tools/tools/<slug>/manifest.ts`: `{ slug, name, description, icon }` (`satisfies ToolManifest`; type in `modules/dev-tools/lib/tool-manifest.ts`; `icon` is a Lucide name, same convention as ModuleManifest). Plain data, no component imports. No `order`/`category`/`tags` in v1: registry array order is gallery order.
- **Tool registry** — `modules/dev-tools/tools/registry.ts`, internal to the module: an array of `{ manifest, load: () => import("./<slug>") }`. The `load` thunk lives in the registry, not the manifest, so the gallery reads only light metadata. Adding Tool #N = one folder + one registry entry. One-way imports (ADR-0003) are untouched: the registry is intra-module, and Tools never import each other.
- **Routing** — `app/(platform)/dev-tools/page.tsx` (gallery) and one dynamic `app/(platform)/dev-tools/[tool]/page.tsx` that resolves the slug via the registry (`generateStaticParams` over registry slugs; `notFound()` otherwise). No per-tool route files.
- **Code-splitting** — each Tool is its own chunk via the registry's dynamic `import()` (`next/dynamic`, `ssr: false` where the Tool is browser-only). The gallery and other modules ship none of a Tool's code or dependencies (e.g. the SVG Sandbox's CodeMirror).
- **Shell** — a `ToolShell` component in `modules/dev-tools/components/` (AppHeader with Tool name/icon, back-to-gallery link, full-bleed `<main>` slot) rendered by the `[tool]` page around the lazily loaded Tool. It is a component, not a Next `layout.tsx`, because the gallery and Tools need different chrome. A Tool owns its whole body.
- **No persistence by default.** Dev Tools has no tables or migrations; a Tool needing them opts in with `dev-tools_`-prefixed tables (ADR-0006).

## Considered Options

- **One module per tool** — rejected: 20+ launcher tiles and manifests for single-purpose utilities that share no data, and it defeats a coherent gallery.
- **Static route per tool** — rejected: needs a route file plus a registry/gallery entry per tool (two places to drift) and repeats the shell.
- **`?tool=` single page** — rejected: poor deep links and back-button behaviour, and weaker splitting.
- **`load` thunk inside the Tool manifest** — rejected: mixes metadata with import sites and makes the manifest harder to treat as plain, unit-testable data.

## Consequences

The `[tool]` page is the only place a Tool's component is mounted; Tool authors never touch `app/`. Because a Tool's chunk loads on navigation, a tool's first paint shows a shell-level loading state. The module is deletable the usual way (folder, `modules/index.ts` entry, route folder).
