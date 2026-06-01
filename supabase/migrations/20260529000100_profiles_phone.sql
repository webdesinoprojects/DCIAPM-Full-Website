-- Voter mobile number captured at profile completion.
-- Nullable so existing admin/voter rows stay valid; the create-profile form requires it
-- for new and incomplete voters (frontend-enforced).

alter table public.profiles
  add column if not exists phone text;

create index if not exists profiles_phone_idx
  on public.profiles(phone)
  where phone is not null;

-- Allow authenticated voters to write their own phone via the existing
-- "Users update own basic profile" RLS policy.
grant update(phone) on public.profiles to authenticated;
