-- Public membership application submission must work for anonymous visitors
-- and for visitors who already have an authenticated voter/admin session.

drop policy if exists "Applicants upload membership assets" on storage.objects;
create policy "Applicants upload membership assets"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'membership-assets'
  and (storage.foldername(name))[1] = 'applications'
);

drop policy if exists "Anyone submits membership applications" on public.membership_applications;
create policy "Anyone submits membership applications"
on public.membership_applications for insert
to anon, authenticated
with check (
  status = 'submitted'
  and membership_number is null
  and bill_number is null
  and approved_at is null
  and approved_by is null
);

grant insert on public.membership_applications to anon, authenticated;
