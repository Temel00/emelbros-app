# Emelbros

A private family web platform for five allowlisted members, built as one Next.js app hosting small modular apps (darts, lists, habits, …) added over time.

## Platform overview

**What it is.** A private home for one family: the owner plus four members, all allowlisted by Google email. Everyone has equal run of the platform — members browse a self-serve module catalog, pin what they want, and arrange their own dashboard; the owner's only extra power is managing the sign-in allowlist. Data visibility is per-record, not per-person: any member can be a participant in any module's shared data.

**Stack (locked).**

- **Framework** — Next.js (App Router), one application, deployed on **Vercel** free tier ([ADR-0012](docs/adr/0012-hosting-vercel-squarespace-dns.md)). The owner's Squarespace-registered domain points at Vercel via DNS records; Squarespace stays registrar.
- **Data & auth** — **Supabase**: Postgres with row-level security as the visibility engine, plus Supabase Auth with **Google sign-in** ([ADR-0011](docs/adr/0011-auth-supabase-google-signin.md)) gated by an `allowed_emails` allowlist ([ADR-0010](docs/adr/0010-allowed-emails-table-managed-via-dashboard.md)).
- **UI** — **Tailwind CSS + shadcn/ui** ([ADR-0014](docs/adr/0014-ui-stack-tailwind-shadcn.md)), mobile-first responsive with a **PWA manifest** for "Add to Home Screen" ([ADR-0015](docs/adr/0015-pwa-responsive-manifest.md)). Visual identity — palette, type, light/dark, per-member accent — is set by [#18](https://github.com/Temel00/emelbros-app/issues/18).

**Architecture.** The platform is a **modular monolith** ([ADR-0013](docs/adr/0013-single-nextjs-app-modular-monolith.md)): each module is a folder under `modules/<slug>/` with its own routes, typed manifest, tables, and migrations, registered in `modules/index.ts`. A module exposes optional dashboard **widgets** and **profile sections**; a member's **dashboard** is an Apps grid plus an At-a-glance widget stack, each independently ordered ([#8](https://github.com/Temel00/emelbros-app/issues/8)). The database holds no module catalog — only per-member pin rows.

**Build order (milestones).**

1. **Walking skeleton** — auth, allowlist, app shell, empty launcher, deployed on the domain.
2. **Darts end-to-end** — the first full module ([darts spec, #5](https://github.com/Temel00/emelbros-app/issues/5)).
3. **Lists, then habits** — ([lists spec, #9](https://github.com/Temel00/emelbros-app/issues/9); [habits spec, #10](https://github.com/Temel00/emelbros-app/issues/10)).

The full, ordered buildout tasklist is produced by [#12](https://github.com/Temel00/emelbros-app/issues/12).

## Decision records

Every locked platform decision has an ADR in [`docs/adr/`](docs/adr/); module specs live in `docs/modules/` and agent/process conventions in [`docs/agents/`](docs/agents/).

| Area | Where |
| --- | --- |
| Module contract (manifests, pinning, layout, scope policies, widgets) | ADRs [0001](docs/adr/0001-code-first-module-manifests.md)–[0005](docs/adr/0005-widget-and-profile-section-contract.md) |
| Data layer (schema, RLS scopes, migrations, query layer) | ADRs [0006](docs/adr/0006-single-schema-slug-prefixed-tables.md)–[0009](docs/adr/0009-query-layer-typed-client-throws.md) |
| Sign-in allowlist | ADR [0010](docs/adr/0010-allowed-emails-table-managed-via-dashboard.md) |
| Authentication (Supabase + Google) | ADR [0011](docs/adr/0011-auth-supabase-google-signin.md) |
| Hosting & DNS (Vercel + Squarespace) | ADR [0012](docs/adr/0012-hosting-vercel-squarespace-dns.md) |
| Modular monolith (one app, module folders) | ADR [0013](docs/adr/0013-single-nextjs-app-modular-monolith.md) |
| UI stack (Tailwind + shadcn/ui) | ADR [0014](docs/adr/0014-ui-stack-tailwind-shadcn.md) |
| PWA & mobile | ADR [0015](docs/adr/0015-pwa-responsive-manifest.md) |
| Testing & CI conventions | [#13](https://github.com/Temel00/emelbros-app/issues/13) |
| Agent buildout-loop conventions | [`docs/agents/agent-loop.md`](docs/agents/agent-loop.md) |
| Visual identity | [#18](https://github.com/Temel00/emelbros-app/issues/18) |
| Module specs (darts, lists, habits) | `docs/modules/` |

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
The rule a module fixes per table for how scope is set: either fixed (the table's records always have one scope, e.g. darts games are always Family) or member-chosen (the owning member picks a scope per record and may change it later, e.g. lists). Declared informationally in the Module Manifest; enforced only by RLS.
_Avoid_: visibility setting

**Pinned**:
A member's choice to show a module on their own launcher/dashboard. Pinning is visibility-only: every module's routes and data are open to all signed-in members regardless, and any member can be a participant in any module's shared data.
_Avoid_: enabled, installed, activated (all imply an access gate that doesn't exist)
