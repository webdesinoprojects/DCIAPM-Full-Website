-- Rich nominee profiles and private CV uploads for election candidates.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'election-documents',
  'election-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users read election documents" on storage.objects;
create policy "Authenticated users read election documents"
on storage.objects for select
to authenticated
using (bucket_id = 'election-documents');

drop policy if exists "Admins manage election documents" on storage.objects;
create policy "Admins manage election documents"
on storage.objects for all
to authenticated
using (bucket_id = 'election-documents' and public.is_admin())
with check (bucket_id = 'election-documents' and public.is_admin());

alter table public.election_candidates
  add column if not exists current_designation text,
  add column if not exists institution text,
  add column if not exists qualification text,
  add column if not exists profile_summary text,
  add column if not exists key_achievements text,
  add column if not exists agenda text,
  add column if not exists cv_path text,
  add column if not exists cv_file_name text,
  add column if not exists cv_mime_type text,
  add column if not exists cv_size bigint;
