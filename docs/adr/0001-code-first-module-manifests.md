# Code-first module manifests

Each module exports a typed `manifest.ts` (`satisfies ModuleManifest`) declaring its identity and offerings: name, slug, icon, description, declared scopes, widgets, profile sections. All manifests register in `modules/index.ts`, the platform's single touchpoint. The database never stores manifest data — a manifest describes what the deployed code can do, so it must version with the code; a DB row can silently drift from the deploy it describes, and TypeScript checks the contract for free.

## Considered Options

DB-first (manifest rows seeded by migrations) was rejected: it invites drift, loses type-checking, and serves a runtime catalog-editing need this 5-user platform doesn't have.
