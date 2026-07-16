# `types/`

Generated database types live here as `database.ts`, produced by
`supabase gen types typescript --local` and committed alongside the migration
that changed the schema (ADR-0008). Nothing is generated at build time — the
checked-in file is the source of truth so Vercel builds need no live Supabase
connection.

Empty until the first migration lands.
