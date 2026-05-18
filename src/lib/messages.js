import { isSupabaseConfigured, supabase } from './supabase';

export const messageStatusLabels = {
  new: 'New',
  read: 'Read',
  replied: 'Replied',
  archived: 'Archived',
};

export function messageStatusClass(status) {
  if (status === 'replied') return 'bg-green-50 text-green-700';
  if (status === 'read') return 'bg-blue-50 text-blue-700';
  if (status === 'archived') return 'bg-gray-100 text-gray-600';
  return 'bg-yellow-50 text-yellow-700';
}

export function formatMessageDate(value) {
  if (!value) return 'Unknown';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export async function submitContactMessage(input) {
  if (!isSupabaseConfigured) {
    return { ok: false, message: 'Messaging is not configured yet. Please email us directly.' };
  }

  const name = String(input.name || '').trim();
  const email = String(input.email || '').trim().toLowerCase();
  const subject = String(input.subject || '').trim();
  const message = String(input.message || '').trim();

  if (!name || !email || !subject || !message) {
    return { ok: false, message: 'Please fill in your name, email, subject and message.' };
  }

  const { error } = await supabase
    .from('contact_messages')
    .insert({ name, email, subject, message, status: 'new' });

  if (error) {
    return { ok: false, message: friendlyMessageError(error.message) };
  }

  return { ok: true };
}

export async function listContactMessages() {
  const { data, error } = await supabase
    .from('contact_messages')
    .select('id,name,email,subject,status,reply_count,replied_at,created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(friendlyMessageError(error.message));
  return data || [];
}

export async function getContactMessage(id) {
  const { data, error } = await supabase
    .from('contact_messages')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(friendlyMessageError(error.message));
  return data;
}

export async function listMessageReplies(messageId) {
  const { data, error } = await supabase
    .from('contact_message_replies')
    .select('id,reply_subject,reply_body,email_status,email_error,created_at')
    .eq('message_id', messageId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(friendlyMessageError(error.message));
  return data || [];
}

export async function updateMessageStatus(id, status) {
  const { data, error } = await supabase
    .from('contact_messages')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(friendlyMessageError(error.message));
  return data;
}

export async function deleteContactMessage(id) {
  const { error } = await supabase.from('contact_messages').delete().eq('id', id);
  if (error) throw new Error(friendlyMessageError(error.message));
}

export async function deleteContactMessageReply(replyId, messageId) {
  const { error } = await supabase
    .from('contact_message_replies')
    .delete()
    .eq('id', replyId);
  if (error) throw new Error(friendlyMessageError(error.message));

  if (messageId) {
    const { count } = await supabase
      .from('contact_message_replies')
      .select('id', { count: 'exact', head: true })
      .eq('message_id', messageId);
    await supabase
      .from('contact_messages')
      .update({ reply_count: count || 0 })
      .eq('id', messageId);
  }
}

// mailto: link — only works if the device has a default mail app registered.
export function buildReplyMailto(toEmail, subject, body) {
  const subjectPart = encodeURIComponent(subject || '');
  const bodyPart = encodeURIComponent(body || '');
  return `mailto:${toEmail}?subject=${subjectPart}&body=${bodyPart}`;
}

// Gmail web compose — a normal https link, opens reliably in any browser.
export function buildGmailCompose(toEmail, subject, body) {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: toEmail || '',
    su: subject || '',
    body: body || '',
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

// Outlook web compose.
export function buildOutlookCompose(toEmail, subject, body) {
  const params = new URLSearchParams({
    to: toEmail || '',
    subject: subject || '',
    body: body || '',
  });
  return `https://outlook.office.com/mail/deeplink/compose?${params.toString()}`;
}

// Logs a reply against the message after the admin drafts it in their email app.
export async function recordContactReply(messageId, replyBody, replySubject) {
  const body = String(replyBody || '').trim();
  const subject = String(replySubject || '').trim() || 'Reply';
  if (!messageId || !body) {
    throw new Error('Please write a reply before logging it.');
  }

  const { data: userData } = await supabase.auth.getUser();
  const sentBy = userData?.user?.id || null;

  const { error: replyError } = await supabase
    .from('contact_message_replies')
    .insert({
      message_id: messageId,
      reply_subject: subject,
      reply_body: body,
      sent_by: sentBy,
      email_status: 'composed',
    });
  if (replyError) throw new Error(friendlyMessageError(replyError.message));

  const { data: current } = await supabase
    .from('contact_messages')
    .select('reply_count')
    .eq('id', messageId)
    .maybeSingle();

  const { error: updateError } = await supabase
    .from('contact_messages')
    .update({
      status: 'replied',
      replied_at: new Date().toISOString(),
      reply_count: (current?.reply_count || 0) + 1,
    })
    .eq('id', messageId);
  if (updateError) throw new Error(friendlyMessageError(updateError.message));
}

function friendlyMessageError(message = '') {
  const normalized = String(message || '').toLowerCase();

  if (normalized.includes('row-level security')) {
    return 'You do not have permission for this action.';
  }
  if (normalized.includes('resend api key')) {
    return 'Email service is not configured. Add RESEND_API_KEY in the Supabase function secrets.';
  }
  if (
    normalized.includes('verify a domain')
    || normalized.includes('testing emails')
    || normalized.includes('onboarding@resend.dev')
    || normalized.includes('resend failed')
  ) {
    return 'Email was blocked because the Resend sender domain is not verified. Set RESEND_FROM to a verified domain in Supabase before replying.';
  }
  if (normalized.includes('rate limit') || normalized.includes('too many')) {
    return 'Email service rate limit was hit. Please retry shortly.';
  }
  if (normalized.includes('admin access required')) {
    return 'Admin access is required to send replies.';
  }
  if (normalized.includes('edge function returned') || normalized.includes('non-2xx')) {
    return 'The reply service rejected the request. Check the Supabase function logs and Resend configuration.';
  }
  if (normalized.includes('not found')) {
    return 'This message could not be found. It may have been deleted.';
  }
  return message || 'Something went wrong. Please try again.';
}
