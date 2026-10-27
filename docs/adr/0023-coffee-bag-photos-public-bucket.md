# Coffee bag photos: one public bucket, member-only writes

Bean bag photos live in the Supabase Storage bucket `coffee-bag-photos`, served through the `next/image` optimizer.

Decided in [#231](https://github.com/Temel00/emelbros-app/issues/231) and built in [#234](https://github.com/Temel00/emelbros-app/issues/234) under map [#229](https://github.com/Temel00/emelbros-app/issues/229).

## Decision

- **Public bucket, `image/jpeg` only, 2 MB limit.** Reads use the plain public URL (`getPhotoUrl`), with no signing and no SELECT policy. The photos are Family-scope bag pictures, not sensitive.
- **Writes** (INSERT/UPDATE/DELETE on `storage.objects` for this bucket) are `to authenticated`, matching the Family-scope table RLS (ADR-0004/0007).
- **Paths** are `<bean_id>/<uuid>.jpg`, a fresh UUID per photo and no upsert, so URLs never go stale in the optimizer cache. The path is stored in the opaque `coffee_bean.photo_path`.
- **Placeholder:** `coffee_bean.photo_blur` holds a tiny JPEG data URL for `blurDataURL`.
- **Bucket created in the migration**, not `supabase/config.toml` (whose bucket section is unused here), so hosted and local stay in step through ADR-0008's hand-written migrations.
- **Orphans:** objects are removed best-effort by the server actions; no trigger or cron, and rare orphans are accepted.
