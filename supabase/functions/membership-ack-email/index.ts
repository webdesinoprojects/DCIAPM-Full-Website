import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { applicationId } = await req.json();
    if (!applicationId) return json({ ok: false, message: 'Application id is required.' }, 400);

    const supabase = serviceClient();
    const { data: application, error } = await supabase
      .from('membership_applications')
      .select('id,applicant_name,email,membership_type_label,amount_label,created_at')
      .eq('id', applicationId)
      .maybeSingle();

    if (error) throw error;
    if (!application) return json({ ok: false, message: 'Application not found.' }, 404);

    const resend = await sendResendEmail({
      to: application.email,
      subject: 'DC-IAPM membership application received',
      html: acknowledgementHtml(application),
    });

    if (!resend.ok) {
      await supabase
        .from('membership_applications')
        .update({ ack_email_error: resend.message })
        .eq('id', application.id);
      return json({ ok: false, message: resend.message }, 502);
    }

    await supabase
      .from('membership_applications')
      .update({ ack_email_sent_at: new Date().toISOString(), ack_email_error: null })
      .eq('id', application.id);

    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ ok: false, message: error.message || 'Unable to send acknowledgement email.' }, 500);
  }
});

function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceRoleKey) throw new Error('Supabase service role is not configured.');
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

async function sendResendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM') || 'DC-IAPM <onboarding@resend.dev>';
  const replyTo = Deno.env.get('MEMBERSHIP_REPLY_TO') || undefined;
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
    const body = await response.text();
    return { ok: false, message: `Resend failed: ${body}` };
  }

  return { ok: true };
}

function acknowledgementHtml(application: Record<string, string>) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#0A2342;">
      <div style="border-bottom:3px solid #D4AF37;padding:24px 0;">
        <h1 style="margin:0;font-size:24px;">DC-IAPM Membership Application</h1>
        <p style="margin:8px 0 0;color:#475569;">We have received your application.</p>
      </div>
      <div style="padding:24px 0;color:#1f2937;line-height:1.6;">
        <p>Dear ${escapeHtml(application.applicant_name)},</p>
        <p>Thank you for applying for <strong>${escapeHtml(application.membership_type_label)}</strong>.</p>
        <p>Your submitted amount is <strong>${escapeHtml(application.amount_label)}</strong>. The secretary/admin team will verify your payment and application details.</p>
        <p>You will receive your receipt and certificate after approval.</p>
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;color:#64748b;font-size:13px;">
        Please keep your transaction details available in case the admin team contacts you for verification.
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
