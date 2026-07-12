# Pinning is visibility-only, not an access gate

"Enabling" a module means pinning it to your own dashboard — nothing more. Every module's routes and data are open to all signed-in members regardless of pinning, and any member can be a participant in any module's shared data (a darts game lands on both players' career records even if one never pinned darts). The Module Registry table therefore stores only pin rows: `(member, module, widget?, position)` — launcher tiles and widgets pin independently.

Consequently there is no per-member access logic anywhere: Scope + RLS control what data a member sees; pinning controls only what their dashboard shows. Profile sections follow the same principle — every profile renders every module's sections, with RLS-empty sections vanishing; members do not curate their profiles.

The word "enabled" is deliberately avoided (see CONTEXT.md) so nobody later builds gate semantics around it.
