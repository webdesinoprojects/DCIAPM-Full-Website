-- Dedicated public notice for the member directory page.
-- This is intentionally separate from the homepage/latest-updates ticker.

create table if not exists public.member_directory_notice (
  id boolean primary key default true,
  title text not null default 'Update your member contact details',
  message text not null default 'If your email or phone number is missing or incorrect in the member directory, please contact DC-IAPM so the admin team can update your record.',
  link_label text not null default 'Contact Us',
  link_url text not null default '/contact-us',
  is_active boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_directory_notice_singleton check (id = true)
);

drop trigger if exists member_directory_notice_set_updated_at on public.member_directory_notice;
create trigger member_directory_notice_set_updated_at
before update on public.member_directory_notice
for each row execute function public.set_updated_at();

insert into public.member_directory_notice (id)
values (true)
on conflict (id) do nothing;

alter table public.member_directory_notice enable row level security;

drop policy if exists "Anyone reads active member directory notice" on public.member_directory_notice;
create policy "Anyone reads active member directory notice"
on public.member_directory_notice for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins manage member directory notice" on public.member_directory_notice;
create policy "Admins manage member directory notice"
on public.member_directory_notice for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.member_directory_notice to anon, authenticated;
grant insert, update, delete on public.member_directory_notice to authenticated;
