# Authentication is Supabase Auth with Google sign-in

Members sign in with Google through Supabase Auth; there is no password login and no other provider in v1. Supabase issues and manages the session, so the app reads the authenticated member from the Supabase client rather than running its own session layer. Access is gated by an allowlist of the five family emails: a "Before User Created" Auth Hook checks the incoming Google email against the `allowed_emails` table and rejects anyone not on it (see [ADR-0010](0010-allowed-emails-table-managed-via-dashboard.md) and the auth research, [#2](https://github.com/Temel00/emelbros-app/issues/2)). Every table's RLS policies key off the Supabase-authenticated member id, so authentication and the data-visibility model ([ADR-0007](0007-scope-enforcement-enum-and-participant-tables.md)) are the same identity.

## Considered Options

**NextAuth** was the original plan and was dropped. Supabase is already the database and RLS engine, and its policies need the caller's identity in the same JWT that authorizes the connection; using Supabase Auth makes the signed-in member and the RLS `auth.uid()` one and the same, with no second identity system to reconcile. NextAuth would have meant bridging a separate session into Supabase's row-level checks for no gain on a five-person app.

**Email/password or magic-link login** was rejected: all five members already have Google accounts, Google sign-in removes password management entirely, and the allowlist is expressed as Google emails anyway.
