-- Fix election position detection so uppercase labels like "EC Member" map correctly.

create or replace function public.election_position_key(p_position text)
returns text
language plpgsql
immutable
as $$
declare
  v text := regexp_replace(lower(coalesce(p_position, '')), '[^a-z0-9]+', ' ', 'g');
  compact text := regexp_replace(lower(coalesce(p_position, '')), '[^a-z0-9]+', '', 'g');
begin
  v := trim(regexp_replace(v, '\s+', ' ', 'g'));

  if v = '' then
    return 'general';
  end if;

  if v ~ '(^| )ec( |$)'
    or compact in ('ec', 'ecmember', 'ecmembers', 'ecmem', 'ecmems')
    or v like '%executive committee%'
    or compact in ('executivecommittee', 'executivecommitteemember', 'executivecommitteemembers') then
    return 'ec_member';
  end if;

  if (v like '%vice%president%' or compact = 'vicepresident') then
    return 'vice_president';
  end if;

  if (v like '%secretary%general%' or compact = 'secretarygeneral') then
    return 'secretary_general';
  end if;

  if (v like '%joint%secretary%' or compact = 'jointsecretary') then
    return 'joint_secretary';
  end if;

  if (v like '%treasurer%' or compact = 'treasurer') then
    return 'treasurer';
  end if;

  if (v like '%president%' or compact = 'president') then
    return 'president';
  end if;

  return regexp_replace(v, '\s+', '_', 'g');
end;
$$;

-- Recompute previously stored vote position keys from nominee positions.
update public.election_votes ev
set position_key = public.election_position_key(ec.position)
from public.election_candidates ec
where ec.id = ev.candidate_id
  and ev.position_key is distinct from public.election_position_key(ec.position);

-- Preserve any accidentally-created EC-like limit rows by folding them into ec_member.
insert into public.election_vote_limits (election_id, position_key, position_label, max_votes, sort_order)
select
  election_id,
  'ec_member',
  'EC Member',
  greatest(1, least(15, max(max_votes))),
  60
from public.election_vote_limits
where position_key in ('ember', 'ecmember', 'ecmembers', 'ecmem', 'ecmems')
  or public.election_position_key(position_label) = 'ec_member'
group by election_id
on conflict (election_id, position_key) do update
set max_votes = greatest(public.election_vote_limits.max_votes, excluded.max_votes),
    position_label = 'EC Member',
    sort_order = 60,
    updated_at = now();

delete from public.election_vote_limits
where position_key <> 'ec_member'
  and (
    position_key in ('ember', 'ecmember', 'ecmembers', 'ecmem', 'ecmems')
    or public.election_position_key(position_label) = 'ec_member'
  );