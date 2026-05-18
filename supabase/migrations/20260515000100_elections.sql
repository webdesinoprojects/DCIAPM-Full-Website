alter table public.profiles
  add column if not exists registration_no text,
  add column if not exists photo_url text,
  add column if not exists photo_path text,
  add column if not exists last_seen_at timestamptz;

create unique index if not exists profiles_registration_no_unique
on public.profiles (registration_no)
where registration_no is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, registration_no, role)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    upper(nullif(new.raw_user_meta_data ->> 'registration_no', '')),
    'user'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        registration_no = coalesce(public.profiles.registration_no, excluded.registration_no);

  return new;
end;
$$;

drop policy if exists "Users create own profile" on public.profiles;
create policy "Users create own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid() and role = 'user' and is_active = true);

grant insert(id, email, full_name, registration_no, photo_url, photo_path, role, is_active, last_seen_at)
on public.profiles to authenticated;

grant update(full_name, registration_no, photo_url, photo_path, last_seen_at)
on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'election-assets',
  'election-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voter-photos',
  'voter-photos',
  false,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can read election assets" on storage.objects;
create policy "Anyone can read election assets"
on storage.objects for select
to public
using (bucket_id = 'election-assets');

drop policy if exists "Admins manage election assets" on storage.objects;
create policy "Admins manage election assets"
on storage.objects for all
to authenticated
using (bucket_id = 'election-assets' and public.is_admin())
with check (bucket_id = 'election-assets' and public.is_admin());

drop policy if exists "Users read own voter photos" on storage.objects;
create policy "Users read own voter photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'voter-photos'
  and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
);

drop policy if exists "Users upload own voter photos" on storage.objects;
create policy "Users upload own voter photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'voter-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users update own voter photos" on storage.objects;
create policy "Users update own voter photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'voter-photos'
  and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
)
with check (
  bucket_id = 'voter-photos'
  and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
);

drop policy if exists "Users delete own voter photos" on storage.objects;
create policy "Users delete own voter photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'voter-photos'
  and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
);

do $$
begin
  create type public.election_status as enum ('draft', 'scheduled', 'active', 'closed', 'archived');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.elections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  status public.election_status not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint elections_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint elections_date_order check (starts_at is null or ends_at is null or starts_at < ends_at)
);

create table if not exists public.election_candidates (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections(id) on delete cascade,
  slug text not null,
  full_name text not null,
  registration_no text not null,
  position text not null,
  message text,
  photo_url text,
  photo_path text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint election_candidates_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint election_candidates_slug_unique unique (election_id, slug),
  constraint election_candidates_registration_unique unique (election_id, registration_no)
);

create table if not exists public.election_votes (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null constraint election_votes_election_id_fkey references public.elections(id) on delete cascade,
  candidate_id uuid not null constraint election_votes_candidate_id_fkey references public.election_candidates(id) on delete restrict,
  voter_id uuid not null constraint election_votes_voter_id_fkey references public.profiles(id) on delete cascade,
  voter_registration_no text not null,
  created_at timestamptz not null default now(),
  constraint election_votes_once_per_election unique (election_id, voter_id)
);

create index if not exists elections_status_dates_idx
on public.elections (status, starts_at, ends_at);

create index if not exists election_candidates_election_idx
on public.election_candidates (election_id, is_active, sort_order);

create index if not exists election_votes_election_idx
on public.election_votes (election_id, created_at desc);

create index if not exists election_votes_candidate_idx
on public.election_votes (candidate_id);

drop trigger if exists elections_set_updated_at on public.elections;
create trigger elections_set_updated_at
before update on public.elections
for each row execute function public.set_updated_at();

drop trigger if exists election_candidates_set_updated_at on public.election_candidates;
create trigger election_candidates_set_updated_at
before update on public.election_candidates
for each row execute function public.set_updated_at();

alter table public.elections enable row level security;
alter table public.election_candidates enable row level security;
alter table public.election_votes enable row level security;

drop policy if exists "Members read visible elections" on public.elections;
create policy "Members read visible elections"
on public.elections for select
to authenticated
using (status <> 'draft' or public.is_admin());

drop policy if exists "Admins manage elections" on public.elections;
create policy "Admins manage elections"
on public.elections for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Members read visible candidates" on public.election_candidates;
create policy "Members read visible candidates"
on public.election_candidates for select
to authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.elections e
    where e.id = election_candidates.election_id
      and (e.status <> 'draft' or public.is_admin())
  )
);

drop policy if exists "Admins manage candidates" on public.election_candidates;
create policy "Admins manage candidates"
on public.election_candidates for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Members read own votes" on public.election_votes;
create policy "Members read own votes"
on public.election_votes for select
to authenticated
using (voter_id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage votes" on public.election_votes;
create policy "Admins manage votes"
on public.election_votes for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.elections to authenticated;
grant select on public.election_candidates to authenticated;
grant select on public.election_votes to authenticated;
grant insert, update, delete on public.elections to authenticated;
grant insert, update, delete on public.election_candidates to authenticated;
grant select, delete on public.election_votes to authenticated;

create or replace function public.cast_election_vote(
  p_election_slug text,
  p_candidate_slug text
)
returns table (
  ok boolean,
  code text,
  vote_id uuid,
  election_id uuid,
  candidate_id uuid,
  voted_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_election public.elections%rowtype;
  v_candidate public.election_candidates%rowtype;
  v_vote public.election_votes%rowtype;
begin
  if v_user_id is null then
    return query select false, 'AUTH_REQUIRED', null::uuid, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_user_id
    and role = 'user'
    and is_active = true;

  if not found then
    return query select false, 'PROFILE_NOT_ALLOWED', null::uuid, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  if nullif(btrim(coalesce(v_profile.full_name, '')), '') is null
    or nullif(btrim(coalesce(v_profile.registration_no, '')), '') is null
    or nullif(btrim(coalesce(v_profile.photo_path, '')), '') is null then
    return query select false, 'PROFILE_INCOMPLETE', null::uuid, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  select *
  into v_election
  from public.elections
  where slug = lower(btrim(p_election_slug));

  if not found then
    return query select false, 'ELECTION_NOT_FOUND', null::uuid, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  if v_election.status <> 'active' then
    return query select false, 'ELECTION_NOT_ACTIVE', null::uuid, v_election.id, null::uuid, null::timestamptz;
    return;
  end if;

  if v_election.starts_at is not null and now() < v_election.starts_at then
    return query select false, 'ELECTION_NOT_STARTED', null::uuid, v_election.id, null::uuid, null::timestamptz;
    return;
  end if;

  if v_election.ends_at is not null and now() > v_election.ends_at then
    return query select false, 'ELECTION_ENDED', null::uuid, v_election.id, null::uuid, null::timestamptz;
    return;
  end if;

  select *
  into v_candidate
  from public.election_candidates ec
  where ec.election_id = v_election.id
    and ec.slug = lower(btrim(p_candidate_slug))
    and ec.is_active = true;

  if not found then
    return query select false, 'CANDIDATE_NOT_FOUND', null::uuid, v_election.id, null::uuid, null::timestamptz;
    return;
  end if;

  insert into public.election_votes (
    election_id,
    candidate_id,
    voter_id,
    voter_registration_no
  )
  values (
    v_election.id,
    v_candidate.id,
    v_user_id,
    v_profile.registration_no
  )
  returning * into v_vote;

  return query select true, 'VOTE_RECORDED', v_vote.id, v_vote.election_id, v_vote.candidate_id, v_vote.created_at;
exception
  when unique_violation then
    select *
    into v_vote
    from public.election_votes ev
    where ev.election_id = v_election.id
      and ev.voter_id = v_user_id
    limit 1;

    return query select false, 'ALREADY_VOTED', v_vote.id, v_vote.election_id, v_vote.candidate_id, v_vote.created_at;
end;
$$;

revoke all on function public.cast_election_vote(text, text) from public;
grant execute on function public.cast_election_vote(text, text) to authenticated;

alter table public.elections replica identity full;
alter table public.election_candidates replica identity full;
alter table public.election_votes replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'elections'
  ) then
    execute 'alter publication supabase_realtime add table public.elections';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'election_candidates'
  ) then
    execute 'alter publication supabase_realtime add table public.election_candidates';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'election_votes'
  ) then
    execute 'alter publication supabase_realtime add table public.election_votes';
  end if;
end $$;
