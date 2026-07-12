# Scope enforcement: enum column, participant join tables, inline RLS templates

Member-chosen Scope Policy tables (ADR-0004) carry a shared `scope` Postgres enum (`private` | `participants` | `family`); fixed-Scope-Policy tables carry no scope column at all — the policy hardcodes the table's one scope. Participants scope, whether fixed or member-chosen, is represented by a join table per participants-relevant table (`darts_games_participants(game_id, member_id)`, `lists_participants(list_id, member_id)`), never an array column: an ordinary, indexable join that a shared helper or per-table policy can express as a plain `exists (...)`, and one that can carry per-participant metadata later if a module needs it.

RLS policies are written inline per table from three canonical shapes, not a shared generic function:

- **Family**: `using (auth.uid() is not null)`
- **Private**: `using (auth.uid() = owner_id)`
- **Participants**: `using (exists (select 1 from <table>_participants where record_id = x.id and member_id = auth.uid()))`

A fully generic participants-check helper would need dynamic SQL to accept an arbitrary table name — a correctness and indexing risk not worth the boilerplate it saves for a handful of modules. Kept honest the same way scope-declaration truthfulness is (ADR-0004): a code-review convention, not runtime machinery.
