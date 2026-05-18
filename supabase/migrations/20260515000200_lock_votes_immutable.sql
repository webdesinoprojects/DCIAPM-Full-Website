-- Votes must be immutable: only the cast_election_vote RPC (security definer) can write.
-- Admins keep read access via the existing "Members read own votes" policy
-- (which already covers public.is_admin()). They lose insert/update/delete entirely.

drop policy if exists "Admins manage votes" on public.election_votes;

revoke insert, update, delete on public.election_votes from authenticated;
revoke select on public.election_votes from authenticated;
grant select on public.election_votes to authenticated;
