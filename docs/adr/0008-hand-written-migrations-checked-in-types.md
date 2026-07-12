# Migrations hand-written via Supabase CLI; generated types checked in

Migration files are hand-written SQL, created via `supabase migration new <slug>_<description>` and edited directly — not generated via `supabase db diff` against a manually-changed local database. Hand-written SQL is what gets reviewed in the PR anyway; `db diff` adds a generate-then-clean-up step and can miss RLS policies or misread a rename as drop-and-add. Migrations live in the single `supabase/migrations/` folder per ADR-0003; local dev applies them fresh via `supabase start`, per the testing conventions ([issue #13](https://github.com/Temel00/emelbros-app/issues/13)).

Database types are generated with `supabase gen types typescript --local` into a checked-in `types/database.ts`, run manually whenever a migration changes the schema and committed in the same PR — not generated at build time, which would require a live Supabase connection during every Vercel build.
