# Per-table scope policies, enforced by RLS only

Every module table has exactly one Scope Policy, decided by the module: either **fixed** (records always carry one Scope — darts games are always Participants, since a "private" game would corrupt the other player's stats) or **member-chosen** (the owning member picks Private/Participants/Family per record and may change it later — a private list flipped to family is a supported operation every member-chosen table's RLS must handle).

The manifest's scope declaration is an informational, truthful label for the catalog page; Postgres RLS is the only enforcement. A code-review convention — not runtime machinery — keeps manifest and policies honest. Detailed RLS conventions are defined by the data-layer conventions decision (issue #6).
