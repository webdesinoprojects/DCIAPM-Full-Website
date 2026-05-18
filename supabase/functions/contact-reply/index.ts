import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { messageId, replyBody, replySubject } = await req.json();
    if (!messageId || !String(replyBody || '').trim()) {
      return json({ ok: false, message: 'Message id and reply body are required.' }, 400);
    }

    const supabase = serviceClient();

    const admin = await requireAdmin(req, supabase);
    if (!admin.ok) return json({ ok: false, message: admin.message }, admin.status);

    const { data: message, error } = await supabase
      .from('contact_messages')
      .select('id,name,email,subject,message,reply_count')
      .eq('id', messageId)
      .maybeSingle();

    if (error) throw error;
    if (!message) return json({ ok: false, message: 'Message not found.' }, 404);

    const subject = String(replySubject || '').trim() || `Re: ${message.subject}`;
    const body = String(replyBody).trim();

    const resend = await sendResendEmail({
      to: message.email,
      subject,
      html: replyHtml(message, body),
    });

    await supabase.from('contact_message_replies').insert({
      message_id: message.id,
      reply_subject: subject,
      reply_body: body,
      sent_by: admin.userId,
      email_status: resend.ok ? 'sent' : 'failed',
      email_error: resend.ok ? null : resend.message,
    });

    if (!resend.ok) {
      // Return 200 so the client reads { ok:false, message } and can show the
      // real Resend reason (e.g. unverified domain) instead of a generic error.
      return json({ ok: false, message: resend.message }, 200);
    }

    await supabase
      .from('contact_messages')
      .update({
        status: 'replied',
        replied_at: new Date().toISOString(),
        reply_count: (message.reply_count || 0) + 1,
      })
      .eq('id', message.id);

    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ ok: false, message: error.message || 'Unable to send reply.' }, 500);
  }
});

function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceRoleKey) throw new Error('Supabase service role is not configured.');
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

async function requireAdmin(req: Request, supabase: ReturnType<typeof serviceClient>) {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, status: 401, message: 'Missing authorization.' };

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return { ok: false, status: 401, message: 'Invalid or expired session.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role,is_active')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin' || profile.is_active !== true) {
    return { ok: false, status: 403, message: 'Admin access required.' };
  }

  return { ok: true, status: 200, message: '', userId: data.user.id };
}

async function sendResendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM') || 'DC-IAPM <onboarding@resend.dev>';
  const replyTo = Deno.env.get('CONTACT_REPLY_TO') || Deno.env.get('MEMBERSHIP_REPLY_TO') || undefined;
  if (!apiKey) return { ok: false, message: 'Resend API key is not configured.' };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    return { ok: false, message: `Resend failed (${response.status}): ${responseBody}` };
  }

  return { ok: true, message: '' };
}

function replyHtml(message: Record<string, string>, body: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#0A2342;">
      <div style="border-bottom:3px solid #D4AF37;padding:24px 0;">
        <h1 style="margin:0;font-size:22px;">DC-IAPM</h1>
        <p style="margin:8px 0 0;color:#475569;">A reply to your enquiry</p>
      </div>
      <div style="padding:24px 0;color:#1f2937;line-height:1.6;">
        <p>Dear ${escapeHtml(message.name)},</p>
        <div style="white-space:pre-wrap;">${escapeHtml(body)}</div>
        <p style="margin-top:24px;">Warm regards,<br/>DC-IAPM Team</p>
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;color:#64748b;font-size:13px;">
        <p style="margin:0 0 6px;font-weight:bold;">Your original message</p>
        <p style="margin:0;"><strong>Subject:</strong> ${escapeHtml(message.subject)}</p>
        <p style="margin:8px 0 0;white-space:pre-wrap;">${escapeHtml(message.message)}</p>
      </div>
    </div>
  `;
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
