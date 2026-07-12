# Single `public` schema; platform tables stay unprefixed

All tables — platform and module — live in the single default `public` Postgres schema; there are no per-module Postgres schemas. Module tables carry their module's slug as a prefix (`darts_games`, per ADR-0003); platform tables (`profiles`, the module registry, dashboard-layout state) stay bare, since there is exactly one platform and no ambiguity for a prefix to resolve.

## Considered Options

Per-module Postgres schemas were considered, for stronger isolation between modules. Rejected: this 5-user platform doesn't need isolation beyond RLS, per-schema config adds Supabase `db.schemas` exposure overhead, and cross-schema queries (a widget reading another module's table, sanctioned by ADR-0003) get harder to write and reason about than a same-schema, prefix-disambiguated table.
