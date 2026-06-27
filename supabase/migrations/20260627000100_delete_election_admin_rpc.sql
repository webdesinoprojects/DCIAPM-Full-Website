-- Admin-only deletion for elections with immutable vote records.
-- The browser cannot delete election_votes directly; this function runs server-side
-- after checking the signed-in user is an admin.

create or replace function public.delete_election_admin(p_election_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can delete elections.' using errcode = '42501';
  end if;

  if p_election_id is null then
    raise exception 'Election id is required.' using errcode = '22023';
  end if;

  delete from public.election_votes
  where election_id = p_election_id;

  delete from public.elections
  where id = p_election_id;
end;
$$;

revoke all on function public.delete_election_admin(uuid) from public;
grant execute on function public.delete_election_admin(uuid) to authenticated;