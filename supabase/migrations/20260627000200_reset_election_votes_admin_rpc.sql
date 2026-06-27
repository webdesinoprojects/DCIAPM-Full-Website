-- Admin-only vote reset for a single election.
-- Keeps the election and nominees intact; deletes only election_votes for p_election_id.

create or replace function public.reset_election_votes_admin(p_election_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer := 0;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can reset election votes.' using errcode = '42501';
  end if;

  if p_election_id is null then
    raise exception 'Election id is required.' using errcode = '22023';
  end if;

  delete from public.election_votes
  where election_id = p_election_id;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.reset_election_votes_admin(uuid) from public;
grant execute on function public.reset_election_votes_admin(uuid) to authenticated;