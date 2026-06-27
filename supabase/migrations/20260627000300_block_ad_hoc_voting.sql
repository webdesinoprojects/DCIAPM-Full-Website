-- Block Ad Hoc members from voter access and vote casting.
-- AH-series / Ad Hoc members remain valid members but are not eligible voters.

create or replace function public.member_voting_eligibility(p_registration_no text)
returns table (
  ok boolean,
  code text,
  message text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_registration_no text := public.normalize_registration_no_value(p_registration_no);
  v_directory_number text;
  v_membership_status text;
begin
  if v_registration_no is null then
    return query select
      false,
      'REGISTRATION_REQUIRED',
      'Registration number is required.';
    return;
  end if;

  select md.registration_number, coalesce(md.membership_status, '')
  into v_directory_number, v_membership_status
  from public.member_directory md
  where md.is_active = true
    and public.normalize_registration_no_value(md.registration_number) = v_registration_no
  limit 1;

  if not found then
    return query select
      false,
      'REGISTRATION_NOT_FOUND',
      'This registration number is not in the active member directory.';
    return;
  end if;

  if v_registration_no like 'AH%'
    or lower(v_membership_status) like '%ad hoc%'
    or lower(v_membership_status) like '%adhoc%' then
    return query select
      false,
      'AD_HOC_NOT_ELIGIBLE',
      'Ad Hoc members are not eligible to vote in DC-IAPM elections. Please contact the administrator if this is incorrect.';
    return;
  end if;

  return query select
    true,
    'REGISTRATION_ALLOWED',
    'Registration number can be used for voter access.';
end;
$$;

grant execute on function public.member_voting_eligibility(text) to anon, authenticated;

create or replace function public.count_active_voting_profiles()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.profiles p
  where p.role = 'user'
    and p.is_active = true
    and exists (
      select 1
      from public.member_voting_eligibility(p.registration_no) eligibility
      where eligibility.ok = true
    );
$$;

grant execute on function public.count_active_voting_profiles() to authenticated;

create or replace function public.check_voter_registration_number(p_registration_no text)
returns table (
  ok boolean,
  code text,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registration_no text := public.normalize_registration_no_value(p_registration_no);
  v_eligibility record;
begin
  select *
  into v_eligibility
  from public.member_voting_eligibility(v_registration_no);

  if not coalesce(v_eligibility.ok, false) then
    return query select
      false,
      v_eligibility.code::text,
      v_eligibility.message::text;
    return;
  end if;

  if exists (
    select 1
    from public.profiles p
    where public.normalize_registration_no_value(p.registration_no) = v_registration_no
  ) then
    return query select
      false,
      'REGISTRATION_ALREADY_USED',
      'This registration number is already linked to another account.';
    return;
  end if;

  return query select
    true,
    'REGISTRATION_ALLOWED',
    'Registration number can be used.';
end;
$$;

grant execute on function public.check_voter_registration_number(text) to anon, authenticated;

create or replace function public.ensure_profile_registration_no_valid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registration_no text := public.normalize_registration_no_value(new.registration_no);
  v_eligibility record;
begin
  if v_registration_no is null then
    new.registration_no := null;
    return new;
  end if;

  select *
  into v_eligibility
  from public.member_voting_eligibility(v_registration_no);

  if not coalesce(v_eligibility.ok, false) then
    raise exception '%', v_eligibility.code
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.id <> new.id
      and public.normalize_registration_no_value(p.registration_no) = v_registration_no
  ) then
    raise exception 'REGISTRATION_ALREADY_USED'
      using errcode = '23505';
  end if;

  new.registration_no := v_registration_no;
  return new;
end;
$$;

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
  v_eligibility record;
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
  into v_eligibility
  from public.member_voting_eligibility(v_profile.registration_no);

  if not coalesce(v_eligibility.ok, false) then
    return query select false, v_eligibility.code::text, null::uuid, null::uuid, null::uuid, null::timestamptz;
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
