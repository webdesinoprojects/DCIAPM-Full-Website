-- Editable President, Vice President, and Secretary profile/message content.

create table if not exists public.leadership_messages (
  role text primary key,
  name text not null,
  designation text not null,
  organization text not null default 'DC-IAPM',
  image_url text,
  image_path text,
  image_file_id text,
  image_provider text not null default 'supabase',
  excerpt text,
  message text not null,
  signature_name text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leadership_messages_role_check check (role in ('president', 'vice_president', 'secretary'))
);

create index if not exists leadership_messages_public_idx
  on public.leadership_messages (is_active, sort_order);

drop trigger if exists leadership_messages_set_updated_at on public.leadership_messages;
create trigger leadership_messages_set_updated_at
before update on public.leadership_messages
for each row execute function public.set_updated_at();

alter table public.leadership_messages enable row level security;

drop policy if exists "Anyone reads active leadership messages" on public.leadership_messages;
create policy "Anyone reads active leadership messages"
on public.leadership_messages for select
to anon, authenticated
using (is_active or public.is_admin());

drop policy if exists "Admins manage leadership messages" on public.leadership_messages;
create policy "Admins manage leadership messages"
on public.leadership_messages for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.leadership_messages to anon, authenticated;
grant insert, update, delete on public.leadership_messages to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.leadership_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
