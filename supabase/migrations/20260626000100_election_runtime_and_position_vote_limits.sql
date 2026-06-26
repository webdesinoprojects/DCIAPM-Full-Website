-- Runtime election activation and per-position vote limits.

create or replace function public.election_position_key(p_position text)
returns text
language plpgsql
immutable
as $$
declare
  v text := lower(regexp_replace(coalesce(p_position, ''), '[^a-z0-9]+', ' ', 'g'));
begin
  v := trim(regexp_replace(v, '\s+', ' ', 'g'));

  if v = '' then
    return 'general';
  end if;

  if v ~ '(^| )ec( |$)' or v like '%executive committee%' then
    return 'ec_member';
  end if;

  if v like '%vice%president%' then
    return 'vice_president';
  end if;

  if v like '%president%' then
    return 'president';
  end if;

  if v like '%secretary%general%' then
    return 'secretary_general';
  end if;

  if v like '%joint%secretary%' then
    return 'joint_secretary';
  end if;

  if v like '%treasurer%' then
    return 'treasurer';
  end if;

  return regexp_replace(v, '\s+', '_', 'g');
end;
$$;

create table if not exists public.election_vote_limits (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections(id) on delete cascade,
  position_key text not null,
  position_label text not null,
  max_votes integer not null default 1,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint election_vote_limits_unique unique (election_id, position_key),
  constraint election_vote_limits_position_key_check check (position_key ~ '^[a-z0-9_]{1,80}$'),
  constraint election_vote_limits_max_votes_check check (max_votes between 1 and 15)
);

create index if not exists election_vote_limits_election_idx
  on public.election_vote_limits(election_id, sort_order, position_label);

alter table public.election_vote_limits enable row level security;

drop policy if exists "Members read election vote limits" on public.election_vote_limits;
create policy "Members read election vote limits"
on public.election_vote_limits for select
to authenticated
using (
  exists (
    select 1
    from public.elections e
    where e.id = election_vote_limits.election_id
      and (e.status <> 'draft' or public.is_admin())
  )
);

drop policy if exists "Admins manage election vote limits" on public.election_vote_limits;
create policy "Admins manage election vote limits"
on public.election_vote_limits for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.election_vote_limits to authenticated;
grant insert, update, delete on public.election_vote_limits to authenticated;

drop trigger if exists election_vote_limits_set_updated_at on public.election_vote_limits;
create trigger election_vote_limits_set_updated_at
before update on public.election_vote_limits
for each row execute function public.set_updated_at();

create or replace function public.ensure_default_election_vote_limits(p_election_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.election_vote_limits (election_id, position_key, position_label, max_votes, sort_order)
  values
    (p_election_id, 'president', 'President', 1, 10),
    (p_election_id, 'vice_president', 'Vice President', 1, 20),
    (p_election_id, 'secretary_general', 'Secretary General', 1, 30),
    (p_election_id, 'joint_secretary', 'Joint Secretary', 1, 40),
    (p_election_id, 'treasurer', 'Treasurer', 1, 50),
    (p_election_id, 'ec_member', 'EC Member', 1, 60)
  on conflict (election_id, position_key) do nothing;
$$;

create or replace function public.ensure_default_election_vote_limits_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_default_election_vote_limits(new.id);
  return new;
end;
$$;

drop trigger if exists election_default_vote_limits on public.elections;
create trigger election_default_vote_limits
after insert on public.elections
for each row execute function public.ensure_default_election_vote_limits_trigger();

select public.ensure_default_election_vote_limits(id) from public.elections;

alter table public.election_votes
  add column if not exists position_key text;

update public.election_votes ev
set position_key = public.election_position_key(ec.position)
from public.election_candidates ec
where ec.id = ev.candidate_id
  and ev.position_key is null;

alter table public.election_votes
  drop constraint if exists election_votes_once_per_election;

create unique index if not exists election_votes_once_per_candidate
  on public.election_votes(election_id, voter_id, candidate_id);

create index if not exists election_votes_position_idx
  on public.election_votes(election_id, voter_id, position_key);

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
  v_position_key text;
  v_max_votes integer;
  v_position_vote_count integer;
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

  if v_election.status not in ('scheduled', 'active') then
    return query select false, 'ELECTION_NOT_ACTIVE', null::uuid, v_election.id, null::uuid, null::timestamptz;
    return;
  end if;

  if v_election.status = 'scheduled' and v_election.starts_at is null then
    return query select false, 'ELECTION_NOT_STARTED', null::uuid, v_election.id, null::uuid, null::timestamptz;
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

  v_position_key := public.election_position_key(v_candidate.position);

  select coalesce(max_votes, 1)
  into v_max_votes
  from public.election_vote_limits
  where election_vote_limits.election_id = v_election.id
    and election_vote_limits.position_key = v_position_key;

  v_max_votes := coalesce(v_max_votes, 1);

  select *
  into v_vote
  from public.election_votes ev
  where ev.election_id = v_election.id
    and ev.voter_id = v_user_id
    and ev.candidate_id = v_candidate.id;

  if found then
    return query select false, 'ALREADY_VOTED', v_vote.id, v_vote.election_id, v_vote.candidate_id, v_vote.created_at;
    return;
  end if;

  select count(*)
  into v_position_vote_count
  from public.election_votes ev
  where ev.election_id = v_election.id
    and ev.voter_id = v_user_id
    and coalesce(ev.position_key, public.election_position_key((select ec.position from public.election_candidates ec where ec.id = ev.candidate_id))) = v_position_key;

  if v_position_vote_count >= v_max_votes then
    return query select false, 'POSITION_VOTE_LIMIT_REACHED', null::uuid, v_election.id, v_candidate.id, null::timestamptz;
    return;
  end if;

  insert into public.election_votes (
    election_id,
    candidate_id,
    voter_id,
    voter_registration_no,
    position_key
  )
  values (
    v_election.id,
    v_candidate.id,
    v_user_id,
    v_profile.registration_no,
    v_position_key
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
      and ev.candidate_id = v_candidate.id
    limit 1;

    return query select false, 'ALREADY_VOTED', v_vote.id, v_vote.election_id, v_vote.candidate_id, v_vote.created_at;
end;
$$;

revoke all on function public.cast_election_vote(text, text) from public;
grant execute on function public.cast_election_vote(text, text) to authenticated;
