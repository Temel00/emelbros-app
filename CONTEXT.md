# Emelbros

A private family web platform for five allowlisted members, built as one Next.js app hosting small modular apps (darts, lists, habits, …) added over time.

## Language

**Module**:
A self-contained mini-app (darts, lists, habits) living in its own folder of the one Next.js app, described by its Module Manifest.
_Avoid_: app, plugin, feature

**Module Manifest**:
The typed TypeScript object each module exports from its folder, declaring its identity and what it offers (name, slug, icon, description, scopes, widgets, profile contributions). Code-first: it versions with the deploy, never stored in the database.
_Avoid_: module config, module record

**Module Registry**:
The database table holding only dynamic module state — which members have pinned which modules, and their dashboard arrangement. Never duplicates manifest fields.
_Avoid_: module catalog (that's the browsing page, not the table)

**Widget**:
A small at-a-glance card a module offers for the dashboard, declared in its Module Manifest. Members pin widgets independently of pinning the module itself.
_Avoid_: card, tile (a tile is the launcher entry, not a widget)

**Dashboard**:
A member's personal home surface: their launcher grid of pinned module tiles plus their pinned widgets, arranged by them.
_Avoid_: home page, portal

**Scope**:
The visibility level of a piece of module data: Private (owner only), Participants (members the record involves), or Family (all members).
_Avoid_: permission, sharing level

**Scope Policy**:
The rule a module fixes per table for how scope is set: either fixed (the table's records always have one scope, e.g. darts games are always Participants) or member-chosen (the owning member picks a scope per record and may change it later, e.g. lists). Declared informationally in the Module Manifest; enforced only by RLS.
_Avoid_: visibility setting

**Pinned**:
A member's choice to show a module on their own launcher/dashboard. Pinning is visibility-only: every module's routes and data are open to all signed-in members regardless, and any member can be a participant in any module's shared data.
_Avoid_: enabled, installed, activated (all imply an access gate that doesn't exist)
