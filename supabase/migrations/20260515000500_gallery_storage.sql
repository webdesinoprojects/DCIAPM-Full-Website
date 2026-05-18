-- Switch gallery + event image hosting from ImageKit to Supabase Storage.
-- One public bucket `gallery-assets` for both gallery images and event hero/author photos.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gallery-assets',
  'gallery-assets',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can read gallery assets" on storage.objects;
create policy "Anyone can read gallery assets"
on storage.objects for select
to public
using (bucket_id = 'gallery-assets');

drop policy if exists "Admins manage gallery assets" on storage.objects;
create policy "Admins manage gallery assets"
on storage.objects for all
to authenticated
using (bucket_id = 'gallery-assets' and public.is_admin())
with check (bucket_id = 'gallery-assets' and public.is_admin());
