-- Contact form messages + admin replies (reply email sent via the contact-reply edge function).

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  status text not null default 'new',
  reply_count integer not null default 0,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_messages_email_check check (email = lower(trim(email))),
  constraint contact_messages_status_check check (status in ('new', 'read', 'replied', 'archived'))
);

create index if not exists contact_messages_admin_idx
  on public.contact_messages (created_at desc, status);

create table if not exists public.contact_message_replies (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.contact_messages(id) on delete cascade,
  reply_subject text not null,
  reply_body text not null,
  sent_by uuid references public.profiles(id) on delete set null,
  email_status text not null default 'sent',
  email_error text,
  created_at timestamptz not null default now(),
  constraint contact_message_replies_email_status_check check (email_status in ('sent', 'failed'))
);

create index if not exists contact_message_replies_message_idx
  on public.contact_message_replies (message_id, created_at desc);

drop trigger if exists contact_messages_set_updated_at on public.contact_messages;
create trigger contact_messages_set_updated_at
before update on public.contact_messages
for each row execute function public.set_updated_at();

alter table public.contact_messages enable row level security;
alter table public.contact_message_replies enable row level security;

-- Anyone can submit a contact message, only as a fresh unanswered record.
drop policy if exists "Anyone submits contact messages" on public.contact_messages;
create policy "Anyone submits contact messages"
on public.contact_messages for insert
to anon, authenticated
with check (
  status = 'new'
  and reply_count = 0
  and replied_at is null
);

drop policy if exists "Admins manage contact messages" on public.contact_messages;
create policy "Admins manage contact messages"
on public.contact_messages for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Replies are written by the contact-reply edge function (service role) and read by admins.
drop policy if exists "Admins manage contact replies" on public.contact_message_replies;
create policy "Admins manage contact replies"
on public.contact_message_replies for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant insert on public.contact_messages to anon, authenticated;
grant select, update, delete on public.contact_messages to authenticated;
grant select, insert, update, delete on public.contact_message_replies to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.contact_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
