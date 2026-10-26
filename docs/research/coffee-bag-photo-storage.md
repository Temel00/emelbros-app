# Coffee bag photo capture and storage (1080x1920) with Supabase Storage

Research for issue #220 (child of wayfinder map #217). Question: how to accept a portrait bag photo in this Next.js + Supabase app: camera capture, client-side resize, bucket and policies for Family-scope data, public vs signed URLs, `next/image`, placeholders. Sources are official docs (Supabase, Next.js, MDN) fetched 2026-10-25; repo facts come from this repo.

## 1. Repo state: no Supabase Storage usage yet

- No `storage.from(...)`, `createBucket`, `next/image` or `capture=` anywhere in app code.
- `supabase/config.toml` has `[storage] enabled = true`, `file_size_limit = "50MiB"`, and only a commented-out `[storage.buckets.images]` example (`public = false`, `allowed_mime_types`, `objects_path`). Image transformation is commented out.
- `next.config.ts` is empty (no `images` config). `@supabase/supabase-js ^2.110.6`, `@supabase/ssr ^0.12.3`, `next 16.2.10`.
- Family scope in existing RLS (ADR 0004; `platform_tables.sql`) is simply `using (auth.uid() is not null)` (any signed-in member; sign-in is already gated by the allowlist hook). Migrations are hand-written (ADR 0008), so bucket + policies belong in a migration.

## 2. Capture: file input with `capture`

- `capture` applies only to `<input type="file">`; values `user` (front) / `environment` (rear). It selects the camera when `accept` indicates an image/video type. Per MDN, the OS "can show a UI that lets the user either choose an existing file or create a new one"; on desktop users typically get a normal file picker. Support is "Limited availability" (not Baseline). [MDN capture](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture), spec: [HTML Media Capture](https://w3c.github.io/html-media-capture/#dfn-capture)
- Use `<input type="file" accept="image/*" capture="environment">`. Treat it as a hint and offer a plain library-pick fallback (a second input without `capture`), since the browser may ignore it or skip the gallery option (inference from the MDN wording, not a documented guarantee).

## 3. Client-side resize/compress

- `createImageBitmap(blobOrFile, { resizeWidth, resizeHeight, resizeQuality, imageOrientation })`. `imageOrientation: "from-image"` (default) honours EXIF orientation; `"none"` ignores it. `resizeQuality`: `pixelated | low (default) | medium | high`. [MDN createImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/createImageBitmap)
- Pattern: decode with `from-image` (so portrait phone shots are upright), compute a target size preserving aspect that fits 1080x1920, draw to a canvas and `canvas.toBlob(cb, "image/jpeg", ~0.8)`. (`toBlob` is standard Canvas API, not covered on the createImageBitmap page.) The re-encoded JPEG carries no EXIF, which also strips GPS location (inference).
- A 1080x1920 JPEG is typically a few hundred KB, well under the 6 MB standard-upload ceiling.

## 4. Upload

- Standard upload `supabase.storage.from(bucket).upload(path, file, { contentType: "image/jpeg", upsert })` is intended for files up to 6 MB; Supabase recommends TUS resumable uploads above that. Without `contentType` it is inferred from the extension. Existing path without `upsert: true` returns `400 Asset Already Exists`. [Standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads)
- Prefer a unique path per photo (e.g. `<bag-id>/<uuid>.jpg`): no `upsert` needed (upsert also requires SELECT and UPDATE policies) and URLs change when the photo changes, which is cache-friendly.
- Bucket-level limits (max size, allowed content types) are set on the bucket. [Bucket fundamentals](https://supabase.com/docs/guides/storage/buckets/fundamentals); local config shape in this repo's `config.toml` (`file_size_limit`, `allowed_mime_types`).

## 5. Bucket and policies (Family scope)

- Storage access control is plain RLS on `storage.objects`. "By default Storage does not allow any uploads to buckets without RLS policies." Upload needs only an INSERT policy. [Access control](https://supabase.com/docs/guides/storage/security/access-control)
- Docs' example shapes: INSERT `to authenticated` with a `bucket_id` check; folder scoping via `(storage.foldername(name))[1] = ...`; own-file SELECT via `owner_id = (select auth.jwt()->>'sub')`.
- Fit with Family scope (sketch, not verbatim from docs; adapt in a migration):
  - bucket `coffee-bag-photos`, `public = false`, small `file_size_limit` (~2 MB), `allowed_mime_types = {image/jpeg}`, inserted into `storage.buckets` in the migration (repo hand-writes migrations; dashboard/config are alternatives).
  - SELECT and INSERT: `to authenticated` with `bucket_id = 'coffee-bag-photos'` (Family = any signed-in member).
  - UPDATE/DELETE: restrict to the owner (`owner_id` as in the docs example) or to whoever owns the bag row.
- Service key bypasses RLS entirely ("Service keys entirely bypass RLS policies"); keep server-only if ever used.
- Caveat: object policies do not automatically follow a bag row's scope. If the bag's Scope Policy is member-chosen (Private/Participants/Family), policies would need to join the bag table via a path convention. For Family-only this is unnecessary.

## 6. Public vs signed URLs

- Private bucket (default): all operations, including download, go through RLS; download via user JWT or time-limited signed URL. Public bucket: "effectively bypasses access controls for both retrieving and serving"; anyone with the URL can fetch; writes remain protected. Public bucket files get a "high CDN cache HIT ratio". [Fundamentals](https://supabase.com/docs/guides/storage/buckets/fundamentals), [Downloads](https://supabase.com/docs/guides/storage/serving/downloads)
- `createSignedUrl(path, expiresInSeconds)` returns `data.signedUrl`; signing uses a separate key, so URLs stay valid until expiry even through Auth key rotation. `getPublicUrl(path)` yields `https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>`. [Downloads](https://supabase.com/docs/guides/storage/serving/downloads)
- Recommendation for a private family app: private bucket + signed URLs generated server-side (RSC / query layer), since bag photos are Family-scope and a public URL is readable by anyone who obtains the link. Trade-off: the docs give no caching notes for signed URLs, and a URL that changes per request defeats browser/CDN/Next image caching unless generated with a long expiry and kept stable. A public bucket with unguessable UUID paths is simpler and cacheable but is security-by-obscurity. Open decision for the map.

## 7. `next/image`

- Remote `src` must be allowed via `images.remotePatterns` in `next.config`, e.g. `new URL('https://<project>.supabase.co/storage/v1/object/sign/coffee-bag-photos/**')` or `.../object/public/...`. [Next.js Image](https://nextjs.org/docs/app/api-reference/components/image)
- Next 16 requires `images.qualities` to be configured (unlisted qualities are coerced to the closest allowed entry).
- Docs: "If the `src` image requires authentication, consider using the `unoptimized` property." There is no cache-invalidation mechanism for the optimizer (see `minimumCacheTTL`). For an already-compressed 1080x1920 asset, `unoptimized` (or a custom `loader`) is reasonable and avoids image-optimization quota.
- Layout: `width={1080} height={1920}` or `fill` + `sizes` in a 9/16 container.
- Supabase image transformations (`/render/image/...`, usable via a custom Next loader) are Pro-plan only, max 2500 px, 25 MB, 50 MP, billed beyond quota. [Image transformations](https://supabase.com/docs/guides/storage/serving/image-transformations). Not on the free plan, so resize client-side (section 3).
- Storage quota: Free plan 1 GB. [Pricing](https://supabase.com/docs/guides/storage/management/pricing). At ~300 KB/photo that is thousands of photos.

## 8. Placeholders

- `placeholder="blur"` needs `blurDataURL` for remote/dynamic images (automatic only for static imports); keep it small. [Next.js Image: placeholder, blurDataURL](https://nextjs.org/docs/app/api-reference/components/image)
- Options: (a) generate a tiny (~16-20 px wide) JPEG data URL on the client during the resize and store it in a text column on the bag row; (b) `placeholder="data:image/..."` with a static shimmer or bag silhouette (no schema change); (c) `placeholder="empty"` with a neutral CSS background. (a) looks best; (b) is the zero-schema option.
- Missing-photo state: render a static silhouette, not a broken image.

## 9. Summary of recommendation

1. `<input type="file" accept="image/*" capture="environment">` plus a library-pick fallback.
2. Client: `createImageBitmap` (EXIF-aware) -> canvas -> JPEG blob fitting 1080x1920, quality ~0.8.
3. Private `coffee-bag-photos` bucket created in a hand-written migration; authenticated SELECT/INSERT, owner UPDATE/DELETE; unique path per photo.
4. Serve with server-generated signed URLs (or public bucket + UUID paths if caching matters more).
5. `next/image` with `remotePatterns` and `qualities`; likely `unoptimized`; 9:16 container; tiny `blurDataURL` stored on the row.

## Open items

- Public vs signed (cache vs privacy) decision.
- Whether the bag Scope Policy is Family-only (simple policies) or member-chosen (policies must join the bag table).
- Whether `remotePatterns` matches signed-URL query strings (`?token=`) was not verified; check the pattern `search` field when implementing.
- Free-plan per-file size cap and egress figures were not retrievable from the fetched pages.
