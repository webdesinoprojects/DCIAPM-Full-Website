-- Generated receipt/certificate support and editable member validity dates.

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/html',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
where id = 'membership-assets';

alter table public.member_directory
  add column if not exists valid_from date,
  add column if not exists valid_until date;

create or replace function public.member_valid_until_for(
  p_membership_type text,
  p_valid_from date
)
returns date
language plpgsql
stable
as $$
begin
  if p_valid_from is null then
    return null;
  end if;

  if p_membership_type in ('ad_hoc', 'overseas') then
    return (p_valid_from + interval '3 years' - interval '1 day')::date;
  end if;

  return null;
end;
$$;

create or replace function public.sync_member_directory_from_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_valid_from date;
begin
  if new.status = 'approved' and nullif(trim(new.membership_number), '') is not null then
    v_valid_from := coalesce(new.approved_at, now())::date;

    insert into public.member_directory (
      member_name,
      hospital,
      registration_number,
      email,
      mobile_number,
      address,
      membership_status,
      valid_from,
      valid_until,
      is_active,
      source,
      source_application_id,
      created_by,
      updated_by
    )
    values (
      new.applicant_name,
      new.institution,
      new.membership_number,
      nullif(lower(trim(new.email)), ''),
      nullif(trim(new.phone), ''),
      nullif(trim(new.address), ''),
      new.membership_type_label,
      v_valid_from,
      public.member_valid_until_for(new.membership_type, v_valid_from),
      true,
      'membership_application',
      new.id,
      coalesce(new.approved_by, auth.uid()),
      auth.uid()
    )
    on conflict (registration_number)
    do update set
      member_name = excluded.member_name,
      hospital = excluded.hospital,
      email = excluded.email,
      mobile_number = excluded.mobile_number,
      address = excluded.address,
      membership_status = excluded.membership_status,
      valid_from = excluded.valid_from,
      valid_until = excluded.valid_until,
      is_active = true,
      source = excluded.source,
      source_application_id = excluded.source_application_id,
      updated_by = auth.uid(),
      updated_at = now();
  end if;

  return new;
end;
$$;

update public.member_directory members
set
  valid_from = coalesce(members.valid_from, applications.approved_at::date),
  valid_until = coalesce(
    members.valid_until,
    public.member_valid_until_for(applications.membership_type, applications.approved_at::date)
  )
from public.membership_applications applications
where members.source_application_id = applications.id
  and applications.status = 'approved'
  and applications.approved_at is not null;
