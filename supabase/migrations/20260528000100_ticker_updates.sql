-- Latest Updates ticker: admin-managed short messages scrolling on the homepage EventTicker.

create table if not exists public.ticker_updates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ticker_updates_active_idx
  on public.ticker_updates (is_active, sort_order, created_at desc);

drop trigger if exists ticker_updates_set_updated_at on public.ticker_updates;
create trigger ticker_updates_set_updated_at
before update on public.ticker_updates
for each row execute function public.set_updated_at();

alter table public.ticker_updates enable row level security;

drop policy if exists "Anyone reads active ticker updates" on public.ticker_updates;
create policy "Anyone reads active ticker updates"
on public.ticker_updates for select
to anon, authenticated
using (is_active or public.is_admin());

drop policy if exists "Admins manage ticker updates" on public.ticker_updates;
create policy "Admins manage ticker updates"
on public.ticker_updates for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.ticker_updates to anon, authenticated;
grant insert, update, delete on public.ticker_updates to authenticated;

-- Live updates: admin edits propagate to the homepage ticker without refresh.
do $$
begin
  alter publication supabase_realtime add table public.ticker_updates;
exception when duplicate_object then null;
end $$;
