-- Configurable public membership portal content, plans, categories, and QR assets.

create table if not exists public.membership_portal_settings (
  id boolean primary key default true,
  portal_title text not null default 'Membership Portal',
  portal_subtitle text not null default 'Join the Society or Manage your Membership',
  payment_title text not null default 'Payment Information',
  payment_markdown text not null default '',
  qr_image_path text,
  qr_caption text not null default 'Accepts UPI, GPay, Paytm',
  registration_success_markdown text not null default 'We have received your details. You can check your status in the **Check Status** tab.',
  status_intro_markdown text not null default 'Enter the email address you used during registration to check your status and download documents.',
  promo_enabled boolean not null default true,
  promo_title text not null default 'Promotional Membership Drive',
  promo_markdown text not null default '',
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint membership_portal_settings_singleton check (id = true)
);

create table if not exists public.membership_plan_options (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  description text,
  amount numeric(12, 2) not null,
  currency text not null,
  amount_label text not null,
  duration_label text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint membership_plan_options_slug_check check (slug = lower(trim(slug)) and slug ~ '^[a-z0-9][a-z0-9_-]{1,60}$'),
  constraint membership_plan_options_currency_check check (currency in ('INR', 'USD')),
  constraint membership_plan_options_amount_check check (amount > 0)
);

create table if not exists public.membership_interest_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint membership_interest_categories_slug_check check (slug = lower(trim(slug)) and slug ~ '^[a-z0-9][a-z0-9_-]{1,80}$')
);

create index if not exists membership_plan_options_public_idx
  on public.membership_plan_options (is_active, sort_order, label);

create index if not exists membership_interest_categories_public_idx
  on public.membership_interest_categories (is_active, sort_order, label);

drop trigger if exists membership_portal_settings_set_updated_at on public.membership_portal_settings;
create trigger membership_portal_settings_set_updated_at
before update on public.membership_portal_settings
for each row execute function public.set_updated_at();

drop trigger if exists membership_plan_options_set_updated_at on public.membership_plan_options;
create trigger membership_plan_options_set_updated_at
before update on public.membership_plan_options
for each row execute function public.set_updated_at();

drop trigger if exists membership_interest_categories_set_updated_at on public.membership_interest_categories;
create trigger membership_interest_categories_set_updated_at
before update on public.membership_interest_categories
for each row execute function public.set_updated_at();

insert into public.membership_portal_settings (
  id,
  payment_markdown,
  promo_markdown
)
values (
  true,
  '## Bank Transfer

- **Account Name:** DELHI CH OF IAPM
- **Account No:** 1210463576
- **Bank Details:** CENTRAL BANK OF INDIA
- **Branch:** LADY HARDINGE MED COLL AND HOSPITAL BRANCH, OPP PANCHKUIAN ROAD
- **IFSC Code:** CBIN0283462',
  'Pathologists can become members by paying only **Rs 1,500** until **Dec 31, 2026**.

## Membership numbering rule

Until 31 Dec 2026, Rs 1,500 promotional payments receive an L-series number.

From 1 Jan 2027, Rs 5,000 Life members receive L-series, Rs 1,500 Ad Hoc members receive AH-series, and USD 200 Overseas members receive OS-series numbers.

Please select the appropriate membership type in the application form and complete the payment before the deadline.'
)
on conflict (id) do nothing;

insert into public.membership_plan_options (
  slug,
  label,
  description,
  amount,
  currency,
  amount_label,
  duration_label,
  sort_order
)
values
  (
    'life',
    'Life Membership',
    'One-time payment for lifetime membership and full access to society benefits.',
    5000,
    'INR',
    '5,000 INR',
    'One-Time Payment',
    10
  ),
  (
    'ad_hoc',
    'Ad Hoc Membership (3 years)',
    'Valid for 3 years and renewable on reapplication and repayment for another 3-year period.',
    1500,
    'INR',
    '1,500 INR',
    'Per 3 Years',
    20
  ),
  (
    'overseas',
    'Overseas Membership (3 years)',
    'For overseas eligible or nominated members. Valid for 3 years and renewable in 3-year blocks.',
    200,
    'USD',
    '200 USD',
    'Per 3 Years',
    30
  )
on conflict (slug) do nothing;

insert into public.membership_interest_categories (
  slug,
  label,
  sort_order
)
values
  ('academic-pathologist', 'I am an academic pathologist', 10),
  ('practicing-pathologist', 'I am a practicing pathologist', 20),
  ('post-graduate-student-fellow', 'I am a post graduate student/ fellow', 30),
  ('pathologist-outside-india', 'I am a pathologist working outside India', 40)
on conflict (slug) do nothing;

alter table public.membership_portal_settings enable row level security;
alter table public.membership_plan_options enable row level security;
alter table public.membership_interest_categories enable row level security;

drop policy if exists "Anyone reads membership portal settings" on public.membership_portal_settings;
create policy "Anyone reads membership portal settings"
on public.membership_portal_settings for select
to anon, authenticated
using (true);

drop policy if exists "Admins manage membership portal settings" on public.membership_portal_settings;
create policy "Admins manage membership portal settings"
on public.membership_portal_settings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Anyone reads active membership plans" on public.membership_plan_options;
create policy "Anyone reads active membership plans"
on public.membership_plan_options for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins manage membership plans" on public.membership_plan_options;
create policy "Admins manage membership plans"
on public.membership_plan_options for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Anyone reads active membership categories" on public.membership_interest_categories;
create policy "Anyone reads active membership categories"
on public.membership_interest_categories for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins manage membership categories" on public.membership_interest_categories;
create policy "Admins manage membership categories"
on public.membership_interest_categories for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.membership_portal_settings to anon, authenticated;
grant select on public.membership_plan_options to anon, authenticated;
grant select on public.membership_interest_categories to anon, authenticated;
grant insert, update, delete on public.membership_portal_settings to authenticated;
grant insert, update, delete on public.membership_plan_options to authenticated;
grant insert, update, delete on public.membership_interest_categories to authenticated;

drop policy if exists "Anyone reads membership portal assets" on storage.objects;
create policy "Anyone reads membership portal assets"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'membership-assets'
  and (storage.foldername(name))[1] = 'membership-portal'
);

alter table public.membership_applications
  drop constraint if exists membership_applications_type_check;

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
  new.amount_label := v_plan.amount_label;

  return new;
end;
$$;

drop trigger if exists membership_applications_apply_plan_option on public.membership_applications;
create trigger membership_applications_apply_plan_option
before insert or update of membership_type on public.membership_applications
for each row execute function public.apply_membership_plan_option();
