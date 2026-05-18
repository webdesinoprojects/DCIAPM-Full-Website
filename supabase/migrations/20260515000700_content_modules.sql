-- Content modules: case of the month, publications/documents, governing body.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content-assets',
  'content-assets',
  true,
  20971520,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can read content assets" on storage.objects;
create policy "Anyone can read content assets"
on storage.objects for select
to public
using (bucket_id = 'content-assets');

drop policy if exists "Admins manage content assets" on storage.objects;
create policy "Admins manage content assets"
on storage.objects for all
to authenticated
using (bucket_id = 'content-assets' and public.is_admin())
with check (bucket_id = 'content-assets' and public.is_admin());

create table if not exists public.monthly_cases (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text,
  body text,
  diagnosis text,
  discussion text,
  category text,
  author_name text,
  case_date date not null default current_date,
  hero_image_url text,
  hero_image_path text,
  hero_image_file_id text,
  attachment_url text,
  attachment_path text,
  attachment_file_id text,
  attachment_provider text not null default 'supabase',
  attachment_file_name text,
  attachment_mime_type text,
  attachment_file_size bigint,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monthly_cases_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index if not exists monthly_cases_public_idx
  on public.monthly_cases (is_published, case_date desc, sort_order);
create index if not exists monthly_cases_slug_idx
  on public.monthly_cases (slug);

drop trigger if exists monthly_cases_set_updated_at on public.monthly_cases;
create trigger monthly_cases_set_updated_at
before update on public.monthly_cases
for each row execute function public.set_updated_at();

alter table public.monthly_cases enable row level security;

drop policy if exists "Anyone reads published monthly cases" on public.monthly_cases;
create policy "Anyone reads published monthly cases"
on public.monthly_cases for select
to anon, authenticated
using (is_published or public.is_admin());

drop policy if exists "Admins manage monthly cases" on public.monthly_cases;
create policy "Admins manage monthly cases"
on public.monthly_cases for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.monthly_cases to anon, authenticated;
grant insert, update, delete on public.monthly_cases to authenticated;

create table if not exists public.publications (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  author text,
  category text,
  description text,
  published_on date not null default current_date,
  document_url text,
  document_path text,
  document_file_id text,
  document_provider text not null default 'supabase',
  file_name text,
  mime_type text,
  file_size bigint,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint publications_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index if not exists publications_public_idx
  on public.publications (is_published, published_on desc, sort_order);
create index if not exists publications_slug_idx
  on public.publications (slug);

drop trigger if exists publications_set_updated_at on public.publications;
create trigger publications_set_updated_at
before update on public.publications
for each row execute function public.set_updated_at();

alter table public.publications enable row level security;

drop policy if exists "Anyone reads published publications" on public.publications;
create policy "Anyone reads published publications"
on public.publications for select
to anon, authenticated
using (is_published or public.is_admin());

drop policy if exists "Admins manage publications" on public.publications;
create policy "Admins manage publications"
on public.publications for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.publications to anon, authenticated;
grant insert, update, delete on public.publications to authenticated;

create table if not exists public.governing_body_members (
  id uuid primary key default gen_random_uuid(),
  section text not null default 'governing_member',
  name text not null,
  position text,
  registration_no text,
  image_url text,
  image_path text,
  image_file_id text,
  image_provider text not null default 'supabase',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint governing_body_members_section_check check (section in ('office_bearer', 'governing_member'))
);

create index if not exists governing_body_members_public_idx
  on public.governing_body_members (is_active, section, sort_order);

drop trigger if exists governing_body_members_set_updated_at on public.governing_body_members;
create trigger governing_body_members_set_updated_at
before update on public.governing_body_members
for each row execute function public.set_updated_at();

alter table public.governing_body_members enable row level security;

drop policy if exists "Anyone reads active governing body members" on public.governing_body_members;
create policy "Anyone reads active governing body members"
on public.governing_body_members for select
to anon, authenticated
using (is_active or public.is_admin());

drop policy if exists "Admins manage governing body members" on public.governing_body_members;
create policy "Admins manage governing body members"
on public.governing_body_members for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.governing_body_members to anon, authenticated;
grant insert, update, delete on public.governing_body_members to authenticated;
