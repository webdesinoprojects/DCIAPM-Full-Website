-- Events: card list on /academics-events + blog-style detail at /events/:slug.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text,
  body text,
  hero_image_url text,
  hero_image_path text,
  hero_imagekit_file_id text,
  author_name text,
  author_photo_url text,
  author_photo_path text,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  timer_date timestamptz,
  register_url text,
  flyer_url text,
  abstract_guidelines_url text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index if not exists events_published_idx
  on public.events (is_published, starts_at desc);
create index if not exists events_slug_idx
  on public.events (slug);

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

alter table public.events enable row level security;

drop policy if exists "Anyone reads published events" on public.events;
create policy "Anyone reads published events"
on public.events for select
to anon, authenticated
using (is_published or public.is_admin());

drop policy if exists "Admins manage events" on public.events;
create policy "Admins manage events"
on public.events for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
