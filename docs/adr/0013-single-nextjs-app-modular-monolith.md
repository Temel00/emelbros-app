# One Next.js App Router app; modules are folders, a registry table only tracks pinning

The whole platform is a single Next.js application (App Router), not a shell plus separately deployed micro-apps. Each module is a folder under `modules/<slug>/` carrying its own routes, manifest, tables, and migrations, and every module registers in `modules/index.ts` ([ADR-0001](0001-code-first-module-manifests.md), [ADR-0003](0003-module-layout-and-one-way-imports.md)). Adding a module is adding a folder and a registry entry to the one deploy. The database holds no module catalog: the only dynamic module state is a Module Registry table of pin rows recording which members have pinned which modules and widgets and in what order ([ADR-0002](0002-pinning-is-visibility-only.md)). Pinning is visibility-only — every signed-in member can reach every module's routes and data regardless of pins — so there is no per-module install, enablement, or access gate.

## Considered Options

**Separate deployments per module** (micro-frontends / independent apps behind the domain) were rejected: five users and a handful of small modules get nothing from independent deploys and would pay for it in shared-auth, shared-DB, and cross-linking plumbing. One app keeps a single Supabase project, one RLS surface, and one type-checked module registry.

**A database-driven module catalog** (rows that enable/configure modules at runtime) was rejected in favour of code-first manifests ([ADR-0001](0001-code-first-module-manifests.md)); the registry table is deliberately narrowed to per-member pin state so it can never drift from what the deployed code actually offers.
