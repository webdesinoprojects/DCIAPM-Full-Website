-- Gallery categories and images, served via ImageKit URLs.
-- Admins manage everything; visitors see only published images.

create table if not exists public.gallery_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gallery_categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.gallery_categories(id) on delete set null,
  title text not null,
  description text,
  image_url text not null,
  image_path text,
  imagekit_file_id text,
  width integer,
  height integer,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gallery_images_category_idx
  on public.gallery_images (category_id, is_active, sort_order);
create index if not exists gallery_images_active_idx
  on public.gallery_images (is_active, created_at desc);

drop trigger if exists gallery_categories_set_updated_at on public.gallery_categories;
create trigger gallery_categories_set_updated_at
before update on public.gallery_categories
for each row execute function public.set_updated_at();

drop trigger if exists gallery_images_set_updated_at on public.gallery_images;
create trigger gallery_images_set_updated_at
before update on public.gallery_images
for each row execute function public.set_updated_at();

alter table public.gallery_categories enable row level security;
alter table public.gallery_images enable row level security;

drop policy if exists "Anyone reads active categories" on public.gallery_categories;
create policy "Anyone reads active categories"
on public.gallery_categories for select
to anon, authenticated
using (is_active or public.is_admin());

drop policy if exists "Admins manage categories" on public.gallery_categories;
create policy "Admins manage categories"
on public.gallery_categories for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Anyone reads active images" on public.gallery_images;
create policy "Anyone reads active images"
on public.gallery_images for select
to anon, authenticated
using (is_active or public.is_admin());

drop policy if exists "Admins manage images" on public.gallery_images;
create policy "Admins manage images"
on public.gallery_images for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.gallery_categories to anon, authenticated;
grant select on public.gallery_images to anon, authenticated;
grant insert, update, delete on public.gallery_categories to authenticated;
grant insert, update, delete on public.gallery_images to authenticated;
