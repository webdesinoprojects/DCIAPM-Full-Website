create or replace function public.normalize_registration_no_value(p_value text)
returns text
language sql
immutable
as $$
  select nullif(upper(regexp_replace(btrim(coalesce(p_value, '')), '\s+', '', 'g')), '')
$$;

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
begin
  if v_registration_no is null then
    return query select
      false,
      'REGISTRATION_REQUIRED',
      'Registration number is required.';
    return;
  end if;

  if not exists (
    select 1
    from public.member_directory md
    where md.is_active = true
      and public.normalize_registration_no_value(md.registration_number) = v_registration_no
  ) then
    return query select
      false,
      'REGISTRATION_NOT_FOUND',
      'This registration number is not in the active member directory.';
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
begin
  if v_registration_no is null then
    new.registration_no := null;
    return new;
  end if;

  if not exists (
    select 1
    from public.member_directory md
    where md.is_active = true
      and public.normalize_registration_no_value(md.registration_number) = v_registration_no
  ) then
    raise exception 'REGISTRATION_NOT_FOUND'
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

drop trigger if exists profiles_validate_registration_no on public.profiles;
create trigger profiles_validate_registration_no
before insert or update of registration_no on public.profiles
for each row execute function public.ensure_profile_registration_no_valid();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registration_no text := public.normalize_registration_no_value(new.raw_user_meta_data ->> 'registration_no');
begin
  insert into public.profiles (id, email, full_name, registration_no, role)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    v_registration_no,
    'user'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        registration_no = coalesce(public.profiles.registration_no, excluded.registration_no);

  return new;
end;
$$;
