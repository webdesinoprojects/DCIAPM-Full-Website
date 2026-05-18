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

  select p.*
  into v_profile
  from public.profiles p
  where p.id = v_user_id
    and p.role = 'user'
    and p.is_active = true;

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

  select e.*
  into v_election
  from public.elections e
  where e.slug = lower(btrim(p_election_slug));

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

  select ec.*
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
    select ev.*
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
