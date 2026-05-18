-- Auto membership numbers should continue the real imported sequence.
-- Manually assigned/demo high numbers remain valid, but they should not force
-- the next generated number to jump away from the Excel member list.

create or replace function public.max_membership_number_for_prefix(p_prefix text)
returns integer
language sql
stable
as $$
  select coalesce(max(number_part), 0)
  from (
    select substring(registration_number from length(p_prefix) + 1)::integer as number_part
    from public.member_directory
    where source = 'sheet_import'
      and registration_number ~ ('^' || p_prefix || '[0-9]+$')
  ) existing_numbers;
$$;

create or replace function public.membership_number_available(
  p_membership_number text,
  p_application_id uuid
)
returns boolean
language sql
stable
as $$
  select not exists (
    select 1
    from public.membership_applications
    where membership_number = p_membership_number
      and id <> p_application_id
  )
  and not exists (
    select 1
    from public.member_directory
    where registration_number = p_membership_number
      and coalesce(source_application_id, '00000000-0000-0000-0000-000000000000'::uuid) <> p_application_id
  );
$$;

create or replace function public.approve_membership_application(
  p_application_id uuid,
  p_membership_number text default null,
  p_bill_number text default null
)
returns public.membership_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application public.membership_applications;
  v_prefix text;
  v_existing_max integer;
  v_next integer;
  v_membership_number text;
  v_attempts integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only admins can approve membership applications.';
  end if;

  select *
  into v_application
  from public.membership_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Membership application not found.';
  end if;

  v_membership_number := nullif(trim(p_membership_number), '');

  if v_membership_number is null then
    v_prefix := public.membership_prefix_for(
      v_application.membership_type,
      v_application.amount_paid,
      v_application.currency,
      current_date
    );

    v_existing_max := public.max_membership_number_for_prefix(v_prefix);

    insert into public.membership_counters(prefix, last_value, updated_at)
    values (v_prefix, v_existing_max, now())
    on conflict (prefix)
    do update set last_value = greatest(public.membership_counters.last_value, excluded.last_value),
                  updated_at = now();

    loop
      update public.membership_counters
      set last_value = last_value + 1,
          updated_at = now()
      where prefix = v_prefix
      returning last_value into v_next;

      v_membership_number := v_prefix || lpad(v_next::text, 4, '0');
      exit when public.membership_number_available(v_membership_number, p_application_id);

      v_attempts := v_attempts + 1;
      if v_attempts > 1000 then
        raise exception 'Unable to find an available membership number for prefix %.', v_prefix;
      end if;
    end loop;
  elsif not public.membership_number_available(v_membership_number, p_application_id) then
    raise exception 'Membership number % already exists in the member directory.', v_membership_number;
  end if;

  update public.membership_applications
  set status = 'approved',
      membership_number = v_membership_number,
      bill_number = coalesce(nullif(trim(p_bill_number), ''), v_membership_number),
      approved_at = coalesce(approved_at, now()),
      approved_by = coalesce(approved_by, auth.uid()),
      last_email_status = case when last_email_status is null then 'not_sent' else last_email_status end
  where id = p_application_id
  returning * into v_application;

  return v_application;
end;
$$;

grant execute on function public.approve_membership_application(uuid, text, text) to authenticated;
