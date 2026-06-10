-- Make membership plan rules authoritative for amount labels, number prefixes, and validity.

alter table public.membership_plan_options
  add column if not exists number_prefix text,
  add column if not exists validity_years integer;

alter table public.membership_plan_options
  drop constraint if exists membership_plan_options_number_prefix_check,
  add constraint membership_plan_options_number_prefix_check
    check (number_prefix is null or number_prefix ~ '^[A-Z0-9]{1,8}$');

alter table public.membership_plan_options
  drop constraint if exists membership_plan_options_validity_years_check,
  add constraint membership_plan_options_validity_years_check
    check (validity_years is null or validity_years > 0);

create or replace function public.membership_amount_label(
  p_amount numeric,
  p_currency text
)
returns text
language sql
stable
as $$
  select regexp_replace(to_char(p_amount, 'FM999,999,999,990.00'), '\.00$', '') || ' ' || p_currency;
$$;

update public.membership_plan_options
set
  number_prefix = case
    when slug = 'life' then 'L'
    when slug = 'ad_hoc' then 'L'
    when slug = 'overseas' then 'OS'
    else number_prefix
  end,
  validity_years = case
    when slug in ('ad_hoc', 'overseas') then 3
    else validity_years
  end
where slug in ('life', 'ad_hoc', 'overseas');

update public.membership_plan_options
set amount_label = public.membership_amount_label(amount, currency);

create or replace function public.apply_membership_plan_option()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.membership_plan_options;
begin
  select *
  into v_plan
  from public.membership_plan_options
  where slug = lower(trim(new.membership_type))
    and is_active = true;

  if not found then
    raise exception 'Selected membership plan is not available.';
  end if;

  new.membership_type := v_plan.slug;
  new.membership_type_label := v_plan.label;
  new.amount_paid := v_plan.amount;
  new.currency := v_plan.currency;
  new.amount_label := public.membership_amount_label(v_plan.amount, v_plan.currency);

  return new;
end;
$$;

create or replace function public.membership_prefix_for(
  p_membership_type text,
  p_amount numeric,
  p_currency text,
  p_effective_date date default current_date
)
returns text
language plpgsql
stable
as $$
declare
  v_prefix text;
begin
  select nullif(trim(number_prefix), '')
  into v_prefix
  from public.membership_plan_options
  where slug = lower(trim(p_membership_type));

  if v_prefix is not null then
    return v_prefix;
  end if;

  if p_membership_type = 'overseas' or p_currency = 'USD' or (p_currency = 'INR' and p_amount >= 18000) then
    return 'OS';
  end if;

  if p_membership_type = 'ad_hoc' then
    if p_effective_date <= date '2026-12-31' and p_amount = 1500 then
      return 'L';
    end if;
    return 'AH';
  end if;

  return 'L';
end;
$$;

create or replace function public.member_valid_until_for(
  p_membership_type text,
  p_valid_from date
)
returns date
language plpgsql
stable
as $$
declare
  v_years integer;
begin
  if p_valid_from is null then
    return null;
  end if;

  select validity_years
  into v_years
  from public.membership_plan_options
  where slug = lower(trim(p_membership_type));

  if v_years is not null then
    return (p_valid_from + make_interval(years => v_years) - interval '1 day')::date;
  end if;

  if p_membership_type in ('ad_hoc', 'overseas') then
    return (p_valid_from + interval '3 years' - interval '1 day')::date;
  end if;

  return null;
end;
$$;
