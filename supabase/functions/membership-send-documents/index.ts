import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authorization = req.headers.get('Authorization') || '';
    const { applicationId } = await req.json();
    if (!applicationId) return json({ ok: false, message: 'Application id is required.' }, 400);

    const userClient = anonClient(authorization);
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ ok: false, message: 'Not authenticated.' }, 401);

    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('role,is_active')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (profile?.role !== 'admin' || !profile?.is_active) {
      return json({ ok: false, message: 'Only active admins can send membership documents.' }, 403);
    }

    const supabase = serviceClient();
    const { data: application, error } = await supabase
      .from('membership_applications')
      .select('*')
      .eq('id', applicationId)
      .maybeSingle();

    if (error) throw error;
    if (!application) return json({ ok: false, message: 'Application not found.' }, 404);
    if (application.status !== 'approved') return json({ ok: false, message: 'Approve the application before sending documents.' }, 400);
    if (!application.receipt_path || !application.certificate_path) {
      return json({ ok: false, message: 'Upload both receipt and certificate before sending.' }, 400);
    }

    const receipt = await signedPath(supabase, application.receipt_path);
    const certificate = await signedPath(supabase, application.certificate_path);

    const resend = await sendResendEmail({
      to: application.email,
      subject: `DC-IAPM membership approved - ${application.membership_number}`,
      html: approvedHtml(application),
      attachments: [
        {
          filename: application.receipt_file_name || `receipt-${application.membership_number}.pdf`,
          path: receipt,
        },
        {
          filename: application.certificate_file_name || `certificate-${application.membership_number}.pdf`,
          path: certificate,
        },
      ],
    });

    if (!resend.ok) {
      await supabase
        .from('membership_applications')
        .update({
          last_email_status: 'failed',
          last_email_error: resend.message,
        })
        .eq('id', application.id);
      return json({ ok: false, message: resend.message }, resend.status || 502);
    }

    await supabase
      .from('membership_applications')
      .update({
        documents_sent_at: new Date().toISOString(),
        last_email_status: 'sent',
        last_email_error: null,
      })
      .eq('id', application.id);

    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ ok: false, message: error.message || 'Unable to send membership documents.' }, 500);
  }
});

function anonClient(authorization: string) {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  if (!url || !anonKey) throw new Error('Supabase anon key is not configured.');
  return createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
}

function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceRoleKey) throw new Error('Supabase service role is not configured.');
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

async function signedPath(supabase: ReturnType<typeof createClient>, path: string) {
  const { data, error } = await supabase.storage
    .from('membership-assets')
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

async function sendResendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  attachments: Array<{ filename: string; path: string }>;
}) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM') || 'DC-IAPM <onboarding@resend.dev>';
  const replyTo = Deno.env.get('MEMBERSHIP_REPLY_TO') || undefined;
  if (!apiKey) return { ok: false, status: 500, message: 'Resend API key is not configured.' };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `membership-docs-${to}-${subject}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      attachments,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    const retryHint = response.status === 429 ? ' Resend rate limit hit. Retry later.' : '';
    return { ok: false, status: response.status, message: `Resend failed (${response.status}): ${body}${retryHint}` };
  }

  return { ok: true };
}

function approvedHtml(application: Record<string, string>) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#0A2342;">
      <div style="border-bottom:3px solid #D4AF37;padding:24px 0;">
        <h1 style="margin:0;font-size:24px;">DC-IAPM Membership Approved</h1>
        <p style="margin:8px 0 0;color:#475569;">Your receipt and certificate are attached.</p>
      </div>
      <div style="padding:24px 0;color:#1f2937;line-height:1.6;">
        <p>Dear ${escapeHtml(application.applicant_name)},</p>
        <p>Your ${escapeHtml(application.membership_type_label)} has been approved.</p>
        <p><strong>Membership Number:</strong> ${escapeHtml(application.membership_number)}</p>
        <p><strong>Bill Number:</strong> ${escapeHtml(application.bill_number || application.membership_number)}</p>
        <p>Please find your receipt and membership certificate attached.</p>
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
