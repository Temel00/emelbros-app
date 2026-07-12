# Module layout and one-way imports

A module lives in `modules/<slug>/` — `manifest.ts`, `lib/` (pure decision logic with co-located Vitest tests, per the thin-glue rule), `components/`, `queries.ts`, and its `*.rls.test.ts` suite. Routes are thin glue in `app/(platform)/<slug>/` importing from the module folder (App Router can only serve from `app/`), giving top-level URLs like `/darts`. Migrations live in the single `supabase/migrations/` folder (a Supabase CLI constraint) with slug-prefixed filenames, and all module tables are slug-prefixed (`darts_games`) — the DB-side equivalent of the module folder.

Imports are one-way: modules import from `platform/` (Supabase client factories, current-member helper, member directory, UI kit, widget primitives) and never from another module; the platform imports only `modules/index.ts`, never a specific module. A module is deletable by removing its folder, its index entry, and its tables.

## Consequences

Cross-module features must be the producing module's own widgets, not imports. When a real integration arrives (e.g. a shopping list feeding a financial tracker), the sanctioned paths are data-level (reading the other module's slug-prefixed tables under RLS, which makes those tables a published interface) or a platform-brokered manifest declaration — never a direct module→module import. Do not "fix" the import rule for that case.
