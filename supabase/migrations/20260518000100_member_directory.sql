-- Real member directory replacing the old Google Sheet / Excel-backed directory.

create extension if not exists pg_trgm with schema extensions;

create table if not exists public.member_directory (
  id uuid primary key default gen_random_uuid(),
  member_name text not null,
  hospital text,
  registration_number text not null,
  email text,
  mobile_number text,
  address text,
  membership_status text,
  is_active boolean not null default true,
  source text not null default 'manual',
  source_row integer,
  source_application_id uuid references public.membership_applications(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_directory_registration_number_key unique (registration_number),
  constraint member_directory_email_lower_check check (email is null or email = lower(trim(email)))
);

create index if not exists member_directory_active_registration_idx
  on public.member_directory (is_active, registration_number);

create index if not exists member_directory_source_application_idx
  on public.member_directory (source_application_id)
  where source_application_id is not null;

create index if not exists member_directory_member_name_trgm_idx
  on public.member_directory using gin (member_name extensions.gin_trgm_ops);

create index if not exists member_directory_hospital_trgm_idx
  on public.member_directory using gin (hospital extensions.gin_trgm_ops);

create index if not exists member_directory_registration_trgm_idx
  on public.member_directory using gin (registration_number extensions.gin_trgm_ops);

create index if not exists member_directory_email_trgm_idx
  on public.member_directory using gin (email extensions.gin_trgm_ops);

drop trigger if exists member_directory_set_updated_at on public.member_directory;
create trigger member_directory_set_updated_at
before update on public.member_directory
for each row execute function public.set_updated_at();

alter table public.member_directory enable row level security;

drop policy if exists "Anyone reads active member directory" on public.member_directory;
create policy "Anyone reads active member directory"
on public.member_directory for select
to anon, authenticated
using (is_active or public.is_admin());

drop policy if exists "Admins manage member directory" on public.member_directory;
create policy "Admins manage member directory"
on public.member_directory for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.member_directory to anon, authenticated;
grant insert, update, delete on public.member_directory to authenticated;

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
  end if;

  return new;
end;
$$;

drop trigger if exists membership_application_sync_member_directory on public.membership_applications;
create trigger membership_application_sync_member_directory
after insert or update of status, membership_number, applicant_name, institution, email, phone, address, membership_type_label
on public.membership_applications
for each row execute function public.sync_member_directory_from_application();

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
  updated_by,
  created_at,
  updated_at
)
select
  applicant_name,
  institution,
  membership_number,
  nullif(lower(trim(email)), ''),
  nullif(trim(phone), ''),
  nullif(trim(address), ''),
  membership_type_label,
  true,
  'membership_application',
  id,
  approved_by,
  approved_by,
  coalesce(approved_at, created_at),
  now()
from public.membership_applications
where status = 'approved'
  and nullif(trim(membership_number), '') is not null
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
  updated_by = excluded.updated_by,
  updated_at = now();

do $$
begin
  alter publication supabase_realtime add table public.member_directory;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
