# Mobile-first responsive plus a PWA manifest; offline deferred

The app is built mobile-first and responsive, and ships a PWA web app manifest so members can "Add to Home Screen" and launch it like an installed app (standalone display, icon, name, theme colour). This is the whole mobile story for v1 — no native app is planned, the PWA covers it. **Offline support is deliberately out of scope**: v1 assumes connectivity, ships no service-worker caching or background sync, and behaves as a normal online web app that merely happens to be installable.

## Considered Options

**A native mobile app** (or React Native) was rejected: a responsive PWA reaches all five members on any device with one codebase and no app-store overhead.

**Offline-capable PWA** (service worker, cached shell, sync queue) was deferred past v1: it adds real complexity — cache invalidation, conflict handling against Supabase, stale-data UX — for a family app used on home and mobile networks where being online is the normal case. Revisit as its own effort if a genuine offline need appears.
