-- Membership application workflow: public submissions, admin approval, receipt/certificate delivery.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'membership-assets',
  'membership-assets',
  false,
  20971520,
  array[
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
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Applicants upload membership assets" on storage.objects;
create policy "Applicants upload membership assets"
on storage.objects for insert
to anon
with check (
  bucket_id = 'membership-assets'
  and (storage.foldername(name))[1] = 'applications'
);

drop policy if exists "Admins manage membership assets" on storage.objects;
create policy "Admins manage membership assets"
on storage.objects for all
to authenticated
using (bucket_id = 'membership-assets' and public.is_admin())
with check (bucket_id = 'membership-assets' and public.is_admin());

create table if not exists public.membership_counters (
  prefix text primary key,
  last_value integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.membership_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_name text not null,
  institution text not null,
  qualification text not null,
  practicing_pathologist boolean not null default true,
  student_status text,
  address text not null,
  email text not null,
  phone text not null,
  membership_type text not null,
  membership_type_label text not null,
  amount_paid numeric(12, 2) not null,
  currency text not null,
  amount_label text not null,
  transaction_details text not null,
  interest_category text,
  photo_path text not null,
  photo_mime_type text,
  photo_size bigint,
  payment_proof_path text not null,
  payment_proof_mime_type text,
  payment_proof_size bigint,
  status text not null default 'submitted',
  membership_number text unique,
  bill_number text,
  admin_notes text,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  receipt_url text,
  receipt_path text,
  receipt_file_name text,
  receipt_mime_type text,
  certificate_url text,
  certificate_path text,
  certificate_file_name text,
  certificate_mime_type text,
  ack_email_sent_at timestamptz,
  ack_email_error text,
  documents_sent_at timestamptz,
  last_email_status text not null default 'not_sent',
  last_email_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint membership_applications_email_check check (email = lower(trim(email))),
  constraint membership_applications_type_check check (membership_type in ('life', 'ad_hoc', 'overseas')),
  constraint membership_applications_currency_check check (currency in ('INR', 'USD')),
  constraint membership_applications_status_check check (status in ('submitted', 'under_review', 'approved', 'rejected')),
  constraint membership_applications_email_status_check check (last_email_status in ('not_sent', 'sent', 'failed'))
);

create index if not exists membership_applications_admin_idx
  on public.membership_applications (created_at desc, status, membership_type);

create index if not exists membership_applications_email_idx
  on public.membership_applications (email, created_at desc);

create index if not exists membership_applications_number_idx
  on public.membership_applications (membership_number);

drop trigger if exists membership_applications_set_updated_at on public.membership_applications;
create trigger membership_applications_set_updated_at
before update on public.membership_applications
for each row execute function public.set_updated_at();

alter table public.membership_applications enable row level security;
alter table public.membership_counters enable row level security;

drop policy if exists "Anyone submits membership applications" on public.membership_applications;
create policy "Anyone submits membership applications"
on public.membership_applications for insert
to anon
with check (
  status = 'submitted'
  and membership_number is null
  and bill_number is null
  and approved_at is null
  and approved_by is null
);

drop policy if exists "Admins manage membership applications" on public.membership_applications;
create policy "Admins manage membership applications"
on public.membership_applications for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins manage membership counters" on public.membership_counters;
create policy "Admins manage membership counters"
on public.membership_counters for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant insert on public.membership_applications to anon;
grant select, update, delete on public.membership_applications to authenticated;
grant select, insert, update on public.membership_counters to authenticated;

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
begin
  if p_membership_type = 'overseas' or p_currency = 'USD' or (p_currency = 'INR' and p_amount >= 18000) then
    return 'OS';
  end if;

  if p_membership_type = 'ad_hoc' then
    if p_effective_date <= date '2026-12-31' and p_amount = 1500 then
      return 'L';
    end if;
    return 'AH';
  end if;

  return 'L';
end;
$$;

create or replace function public.approve_membership_application(
  p_application_id uuid,
  p_membership_number text default null,
  p_bill_number text default null
)
returns public.membership_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application public.membership_applications;
  v_prefix text;
  v_next integer;
  v_membership_number text;
begin
  if not public.is_admin() then
    raise exception 'Only admins can approve membership applications.';
  end if;

  select *
  into v_application
  from public.membership_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Membership application not found.';
  end if;

  v_membership_number := nullif(trim(p_membership_number), '');

  if v_membership_number is null then
    v_prefix := public.membership_prefix_for(
      v_application.membership_type,
      v_application.amount_paid,
      v_application.currency,
      current_date
    );

    insert into public.membership_counters(prefix, last_value, updated_at)
    values (v_prefix, 1, now())
    on conflict (prefix)
    do update set last_value = public.membership_counters.last_value + 1,
                  updated_at = now()
    returning last_value into v_next;

    v_membership_number := v_prefix || lpad(v_next::text, 4, '0');
  end if;

  update public.membership_applications
  set status = 'approved',
      membership_number = v_membership_number,
      bill_number = coalesce(nullif(trim(p_bill_number), ''), v_membership_number),
      approved_at = coalesce(approved_at, now()),
      approved_by = coalesce(approved_by, auth.uid()),
      last_email_status = case when last_email_status is null then 'not_sent' else last_email_status end
  where id = p_application_id
  returning * into v_application;

  return v_application;
end;
$$;

grant execute on function public.approve_membership_application(uuid, text, text) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.membership_applications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
