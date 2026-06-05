-- Public homepage can show non-draft election announcements.
-- Nominee details and voting routes remain authenticated.

drop policy if exists "Anyone reads visible election summaries" on public.elections;
create policy "Anyone reads visible election summaries"
on public.elections for select
to anon
using (status <> 'draft');

grant select on public.elections to anon;
