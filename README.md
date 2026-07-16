# Emelbros

A private family web platform, built as one Next.js app hosting small modular
apps (darts, lists, habits, …). See [`CONTEXT.md`](CONTEXT.md) for the platform
overview and [`docs/adr/`](docs/adr/) for the locked decisions.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

## Scripts

| Script                 | What it does                   |
| ---------------------- | ------------------------------ |
| `npm run dev`          | Start the dev server           |
| `npm run build`        | Production build               |
| `npm run lint`         | ESLint (`eslint-config-next`)  |
| `npm run typecheck`    | `tsc --noEmit`                 |
| `npm run test`         | Unit tests once (`vitest run`) |
| `npm run test:watch`   | Unit tests in watch mode       |
| `npm run format`       | Format with Prettier           |
| `npm run format:check` | Verify formatting (used by CI) |

## Layout

The platform is a **modular monolith** ([ADR-0013](docs/adr/0013-single-nextjs-app-modular-monolith.md)):

- `app/` — App Router routes (thin glue).
- `modules/<slug>/` — self-contained modules; each exports a `manifest.ts` and
  registers in [`modules/index.ts`](modules/index.ts) ([ADR-0001](docs/adr/0001-code-first-module-manifests.md), [ADR-0003](docs/adr/0003-module-layout-and-one-way-imports.md)).
- `platform/` — shared kit modules import from: Supabase client factories
  (`platform/supabase/`), typed query helpers, and later member helpers and UI
  primitives. Imports are one-way.
- `components/ui/` — shadcn/ui components, copied in as owned source ([ADR-0014](docs/adr/0014-ui-stack-tailwind-shadcn.md)).
- `types/` — checked-in generated database types ([ADR-0008](docs/adr/0008-hand-written-migrations-checked-in-types.md)).
- `supabase/migrations/` — hand-written SQL migrations, applied locally via
  `supabase db reset` ([ADR-0008](docs/adr/0008-hand-written-migrations-checked-in-types.md)).

## Data layer

Local dev needs the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
and Docker running:

```bash
supabase start                 # boots the local stack
supabase db reset              # applies every migration in supabase/migrations/
supabase gen types typescript --local > types/database.ts
```

Copy `.env.example` to `.env.local` and fill in the values `supabase start`
prints (`API URL` → `NEXT_PUBLIC_SUPABASE_URL`, `anon key` →
`NEXT_PUBLIC_SUPABASE_ANON_KEY`).

## Testing

Unit tests are pure-logic, co-located beside the code (`*.test.ts`), run by
Vitest ([#13](https://github.com/Temel00/emelbros-app/issues/13)). RLS
integration tests (`*.rls.test.ts`) run against a local Supabase stack in a
separate suite and are excluded from `npm run test`; wiring that suite into CI
is tracked by [#13](https://github.com/Temel00/emelbros-app/issues/13).

## CI and branch protection

Every push to `main` and every pull request runs the
[`CI`](.github/workflows/ci.yml) workflow: install → format check → lint →
typecheck → build → unit tests.

**The owner must enable branch protection on `main` so nothing merges on a red
build** ([agent-loop](docs/agents/agent-loop.md), [#13](https://github.com/Temel00/emelbros-app/issues/13)).
In **Settings → Branches → Add branch ruleset** (or Add rule) for `main`:

1. **Require a pull request before merging.**
2. **Require status checks to pass before merging**, and select the **`verify`**
   check from the CI workflow. (Enable _Require branches to be up to date before
   merging_ too.)
3. **Do not allow bypassing the above settings** (or keep it enabled for admins
   as you prefer).

Agents work on branches named `<type>/<issue#>-<slug>` and open a draft PR at
first push, flipping to Ready once CI is green (see
[agent-loop](docs/agents/agent-loop.md)).
