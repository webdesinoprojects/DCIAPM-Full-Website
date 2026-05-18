-- Admin replies are now drafted in the admin's own email client (mailto) and
-- logged here. Allow a 'composed' status alongside 'sent' / 'failed'.

alter table public.contact_message_replies
  drop constraint if exists contact_message_replies_email_status_check;

alter table public.contact_message_replies
  add constraint contact_message_replies_email_status_check
  check (email_status in ('sent', 'failed', 'composed'));
