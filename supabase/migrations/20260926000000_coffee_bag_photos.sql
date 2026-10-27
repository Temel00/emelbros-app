-- Coffee module: bag-photo storage (map #229, grilling #231).
-- Hand-written migration (ADR-0008). One public bucket, so reads need no
-- policy and no signing; writes are limited to signed-in members, matching the
-- Family-scope table RLS. Objects live at `<bean_id>/<uuid>.jpg`; the path is
-- stored in coffee_bean.photo_path.

alter table public.coffee_bean
  add column photo_blur text;

comment on column public.coffee_bean.photo_blur is
  'Tiny JPEG data URL used as the next/image blurDataURL placeholder.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'coffee-bag-photos',
  'coffee-bag-photos',
  true,
  2097152,
  array['image/jpeg']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public bucket: no SELECT policy needed for URL reads.
create policy "coffee_bag_photos_insert_member" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'coffee-bag-photos');

create policy "coffee_bag_photos_update_member" on storage.objects
  for update to authenticated
  using (bucket_id = 'coffee-bag-photos')
  with check (bucket_id = 'coffee-bag-photos');

create policy "coffee_bag_photos_delete_member" on storage.objects
  for delete to authenticated
  using (bucket_id = 'coffee-bag-photos');
