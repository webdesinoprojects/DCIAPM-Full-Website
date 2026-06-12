-- Public member directory must not expose full email or phone in browser responses.
-- Admins still read full member_directory rows through the admin RLS policy.

create or replace function public.mask_public_email(p_email text)
returns text
language sql
immutable
as $$
  select case
    when nullif(trim(p_email), '') is null then null
    when position('@' in p_email) = 0 then left(trim(p_email), 2) || '***'
    else
      left(split_part(trim(p_email), '@', 1), least(3, greatest(1, length(split_part(trim(p_email), '@', 1)))))
      || '***@'
      || split_part(trim(p_email), '@', 2)
  end;
$$;

create or replace function public.mask_public_phone(p_phone text)
returns text
language sql
immutable
as $$
  select case
    when nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), '') is null then null
    when length(regexp_replace(p_phone, '[^0-9]', '', 'g')) <= 4 then '****'
    else
      left(regexp_replace(p_phone, '[^0-9]', '', 'g'), 2)
      || repeat('*', greatest(length(regexp_replace(p_phone, '[^0-9]', '', 'g')) - 4, 4))
      || right(regexp_replace(p_phone, '[^0-9]', '', 'g'), 2)
  end;
$$;

create or replace function public.search_public_member_directory(
  p_search text default '',
  p_email_filter text default 'all',
  p_page integer default 1,
  p_page_size integer default 50
)
returns table (
  id uuid,
  member_name text,
  hospital text,
  registration_number text,
  masked_email text,
  masked_mobile text,
  membership_status text,
  total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with input as (
    select
      trim(coalesce(p_search, '')) as search_term,
      case
        when p_email_filter in ('with_email', 'without_email') then p_email_filter
        else 'all'
      end as email_filter,
      greatest(coalesce(p_page, 1), 1) as page_number,
      least(greatest(coalesce(p_page_size, 50), 10), 200) as page_size
  ),
  filtered as (
    select md.*
    from public.member_directory md
    cross join input i
    where md.is_active = true
      and (
        i.email_filter = 'all'
        or (i.email_filter = 'with_email' and nullif(md.email, '') is not null)
        or (i.email_filter = 'without_email' and nullif(md.email, '') is null)
      )
      and (
        i.search_term = ''
        or md.member_name ilike '%' || i.search_term || '%'
        or md.hospital ilike '%' || i.search_term || '%'
        or md.registration_number ilike '%' || i.search_term || '%'
        or md.email ilike '%' || i.search_term || '%'
        or md.mobile_number ilike '%' || i.search_term || '%'
        or md.membership_status ilike '%' || i.search_term || '%'
      )
  ),
  counted as (
    select count(*) as total from filtered
  ),
  paged as (
    select f.*
    from filtered f
    cross join input i
    order by f.registration_number asc nulls last, f.member_name asc
    limit (select page_size from input)
    offset ((select page_number - 1 from input) * (select page_size from input))
  )
  select
    p.id,
    p.member_name,
    p.hospital,
    p.registration_number,
    public.mask_public_email(p.email) as masked_email,
    public.mask_public_phone(p.mobile_number) as masked_mobile,
    p.membership_status,
    (select total from counted) as total_count
  from paged p;
$$;

drop policy if exists "Anyone reads active member directory" on public.member_directory;

drop policy if exists "Admins read member directory" on public.member_directory;
create policy "Admins read member directory"
on public.member_directory for select
to authenticated
using (public.is_admin());

grant execute on function public.search_public_member_directory(text, text, integer, integer) to anon, authenticated;
grant execute on function public.mask_public_email(text) to anon, authenticated;
grant execute on function public.mask_public_phone(text) to anon, authenticated;

revoke select on public.member_directory from anon;
