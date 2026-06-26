-- Correct membership numbering prefixes and keep rejected applications out of the member directory.

update public.membership_plan_options
set number_prefix = case
    when slug = 'life' then 'L'
    when slug = 'ad_hoc' then 'AH'
    when slug = 'overseas' then 'O'
    when lower(label) like '%promotional%' and lower(label) like '%life%' then 'L'
    else number_prefix
  end
where slug in ('life', 'ad_hoc', 'overseas')
  or (lower(label) like '%promotional%' and lower(label) like '%life%');

create or replace function public.membership_prefix_for(
  p_membership_type text,
  p_amount numeric,
  p_currency text,
  p_effective_date date default current_date
)
returns text
language plpgsql
stable
as $$
declare
  v_prefix text;
begin
  select nullif(trim(number_prefix), '')
  into v_prefix
  from public.membership_plan_options
  where slug = lower(trim(p_membership_type));

  if v_prefix is not null then
    return v_prefix;
  end if;

  if p_membership_type = 'overseas' or p_currency = 'USD' then
    return 'O';
  end if;

  if p_membership_type = 'ad_hoc' then
    return 'AH';
  end if;

  return 'L';
end;
$$;

create or replace function public.sync_member_directory_from_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and nullif(trim(new.membership_number), '') is not null then
    insert into public.member_directory (
      member_name,
      hospital,
      registration_number,
      email,
      mobile_number,
      address,
      membership_status,
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
      is_active = true,
      source = excluded.source,
      source_application_id = excluded.source_application_id,
      updated_by = auth.uid(),
      updated_at = now();
  else
    delete from public.member_directory
    where source = 'membership_application'
      and source_application_id = new.id;
  end if;

  return new;
end;
$$;

update public.membership_applications
set membership_number = null,
    bill_number = null,
    receipt_path = null,
    receipt_file_name = null,
    receipt_mime_type = null,
    certificate_path = null,
    certificate_file_name = null,
    certificate_mime_type = null,
    last_email_status = 'not_sent',
    last_email_error = null
where status = 'rejected';

delete from public.member_directory md
using public.membership_applications ma
where md.source = 'membership_application'
  and md.source_application_id = ma.id
  and ma.status <> 'approved';
