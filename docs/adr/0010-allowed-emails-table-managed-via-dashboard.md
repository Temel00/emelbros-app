# `allowed_emails` table backs the signup hook; owner manages it via the Supabase dashboard

The "Before User Created" Auth Hook (per the auth research, [#2](https://github.com/Temel00/emelbros-app/issues/2)) checks incoming Google sign-in emails against a bare platform table `allowed_emails` (`email text primary key`, `label text`, `created_at timestamptz default now()`) rather than a literal list written into the hook function's SQL. The table is seeded with the initial 5 family emails in the migration that creates it, so a fresh or local Supabase instance comes up pre-populated. RLS is enabled on the table with no policies granted to `anon` or `authenticated` — the hook function is `security definer` and bypasses RLS, and nothing else needs to read this table. For v1, the owner adds/removes rows directly via the Supabase dashboard's table editor; there is no in-app admin UI.

## Considered Options

A hardcoded array inside the hook function's SQL was considered, avoiding a table entirely. Rejected: it turns every allowlist change into a migration and redeploy, where a table turns it into a data edit — a better fit for an operation the owner performs directly and rarely.

An in-app admin UI for managing the table was considered. Rejected for v1: this is a rare, owner-only edit on 5 rows, and building it now would mean inventing an admin/authorization concept a full milestone before anything else on the platform needs one (the module contract, [#4](https://github.com/Temel00/emelbros-app/issues/4), has no notion of "admin" yet). Revisit if the Supabase dashboard ever proves too inconvenient in practice.
